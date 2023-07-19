import React, { useEffect, useState } from 'react';
import {
  Button,
  FlatList,
  Image,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as SQLite from 'expo-sqlite';
import moment from 'moment';

const db = SQLite.openDatabase('emergency-app.db');

type Emergency = {
  id: string;
  title: string;
  date: string;
  description: string;
  image: string;
};

const HomeScreen: React.FC = () => {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState<Emergency | null>(null);

  useEffect(() => {
    createTable();
    loadEmergencies();
  }, []);

  const createTable = () => {
    db.transaction((tx) => {
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS emergencies (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, date TEXT, description TEXT, image TEXT)',
        [],
        () => console.log('Table created'),
        (_, error) => console.log('Error creating table:', error)
      );
    });
  };

  const loadEmergencies = () => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM emergencies',
        [],
        (_, { rows }) => {
          setEmergencies(rows._array.reverse());
        },
        (_, error) => console.log('Error loading emergencies:', error)
      );
    });
  };

  const handleAddEmergency = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Permission to access media library was denied');
      return;
    }

    setIsAddModalVisible(true);
  };

  const handleChooseImage = async () => {
    const imageResult = await ImagePicker.launchImageLibraryAsync();
    if (imageResult.canceled) {
      console.log('Image selection was cancelled');
      return;
    }
    setSelectedImage(imageResult.assets[0].uri);
  };

  const handleTakeImage = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Permission to access media library was denied');
      return;
    }

    const imageResult = await ImagePicker.launchCameraAsync();
    if (imageResult.canceled) {
      console.log('Image capture was cancelled');
      return;
    }
    setSelectedImage(imageResult.assets[0].uri);
  };

  const handleSaveEmergency = () => {
    Keyboard.dismiss();

    if (selectedImage && title && description) {
      const emergency: Emergency = {
        id: Date.now().toString(),
        title,
        date: new Date().toISOString(),
        description,
        image: selectedImage
      };
      db.transaction((tx) => {
        tx.executeSql(
          'INSERT INTO emergencies (id, title, date, description, image) VALUES (?, ?, ?, ?, ?)',
          [
            emergency.id,
            emergency.title,
            emergency.date,
            emergency.description,
            emergency.image,
          ],
          () => {
            console.log('Emergency added');
            setEmergencies((prevEmergencies) => [emergency, ...prevEmergencies]);
            setTitle('');
            setDescription('');
            setSelectedImage(null);
            setIsAddModalVisible(false);
          },
          (_, error) => console.log('Error adding emergency:', error)
        );
      });
    }
  };

  const handleEmergencyPress = async (emergency: Emergency) => {
    setSelectedEmergency(emergency);
    setIsViewModalVisible(true);
  };

  const EmergencyItem: React.FC<{ emergency: Emergency }> = ({ emergency }) => (
    <TouchableOpacity
      style={styles.emergencyItem}
      onPress={() => handleEmergencyPress(emergency)}
    >
      <View style={styles.emergencyImageContainer}>
        <Image
          source={{ uri: emergency.image }}
          style={styles.emergencyImage}
          resizeMode="cover"
        />
      </View>
      <View style={styles.emergencyContent}>
        <Text style={styles.emergencyTitle}>{emergency.title}</Text>
        <Text style={styles.emergencyDescription}>{emergency.description}</Text>
        <Text style={styles.emergencyDate}>
          {moment(emergency.date).fromNow()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={{color: 'white', fontSize: 25, fontWeight: 'bold', alignSelf: 'center', marginBottom: 25, marginTop: 10}}>EMERGENCIES 🏥</Text>
      <FlatList
        data={emergencies}
        renderItem={({ item }) => <EmergencyItem emergency={item} />}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text>No emergencies registered.</Text>}
        contentContainerStyle={styles.flatListContent}
      />
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.addButton]}
          onPress={handleAddEmergency}
        >
          <Ionicons name="md-add-circle" size={30} color="black" />
        </TouchableOpacity>
      </View>

      <Modal visible={isAddModalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsAddModalVisible(false)}
              >
                <Ionicons name="close-outline" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Emergency</Text>
              {selectedImage && (
                <>
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.selectedImage}
                    resizeMode="cover"
                  />
                  <TextInput
                    placeholder="Title"
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholderTextColor="#888"
                  />
                  <TextInput
                    placeholder="Description"
                    style={styles.input}
                    value={description}
                    onChangeText={setDescription}
                    placeholderTextColor="#888"
                    multiline
                  />
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[styles.button, styles.saveButton]}
                      onPress={handleSaveEmergency}
                    >
                      <Text style={[styles.buttonText, { color: '#000', fontWeight: 'bold' }]}>
                        Save
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => {
                        setIsAddModalVisible(false);
                        setTitle('');
                        setDescription('');
                        setSelectedImage(null);
                      }}
                    >
                      <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              {!selectedImage && (
                <View style={styles.chooseImageButtonsContainer}>
                  <TouchableOpacity
                    style={styles.chooseImageButton}
                    onPress={handleChooseImage}
                  >
                    <Text style={styles.chooseImageText}>Choose Image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.chooseImageButton}
                    onPress={handleTakeImage}
                  >
                    <Text style={styles.chooseImageText}>Take Image</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={isViewModalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => setIsViewModalVisible(false)}>
          <View style={styles.modalContainer}>
            {selectedEmergency && (
              <View style={styles.modalContent}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setIsViewModalVisible(false)}
                >
                  <Ionicons name="close-outline" size={24} color="#FFF" />
                </TouchableOpacity>
                <Image
                  source={{ uri: selectedEmergency.image }}
                  style={styles.selectedImage}
                  resizeMode="cover"
                />
                <Text style={styles.selectedTitle}>{selectedEmergency.title}</Text>
                <Text style={styles.selectedDescription}>
                  {selectedEmergency.description}
                </Text>
                <Text style={styles.selectedDate}>
                  {moment(selectedEmergency.date).fromNow()}
                </Text>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  flatListContent: {
    flexGrow: 1,
  },
  emergencyItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  emergencyImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
  },
  emergencyImage: {
    flex: 1,
  },
  emergencyContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  emergencyDescription: {
    marginTop: 8,
    color: '#FFF',
  },
  emergencyDate: {
    marginTop: 8,
    color: '#888',
    textAlign: 'right',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginHorizontal: 6,
  },
  addButton: {
    backgroundColor: '#FFF',
    alignItems: 'flex-end',
    height: 50,
    with: 50
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  chooseImageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  chooseImageButton: {
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    width: '48%',
  },
  chooseImageText: {
    color: '#000',
    fontWeight: 'bold',
  },
  selectedImage: {
    width: Dimensions.get('window').width - 64,
    height: Dimensions.get('window').width - 64,
    borderRadius: 10,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFF',
    width: '100%',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#FFF',
    marginRight: 8,
  },
  cancelButton: {
    backgroundColor: 'red',
    marginLeft: 8,
  },
  selectedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
  },
  selectedDescription: {
    marginTop: 8,
    color: '#FFF',
  },
  selectedDate: {
    marginTop: 8,
    color: '#888',
  },
});

export default HomeScreen;
