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
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as SQLite from 'expo-sqlite';
import moment from 'moment';

const db = SQLite.openDatabase('diary.db');

type Experience = {
  id: string;
  title: string;
  date: string;
  description: string;
  photo: string;
};

const HomeScreen: React.FC = () => {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);

  useEffect(() => {
    createTable();
    loadExperiences();
  }, []);

  const createTable = () => {
    db.transaction((tx) => {
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS experiences (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, date TEXT, description TEXT, photo TEXT)',
        [],
        () => console.log('Table created'),
        (_, error) => console.log('Error creating table:', error)
      );
    });
  };

  const loadExperiences = () => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM experiences',
        [],
        (_, { rows }) => {
          setExperiences(rows._array.reverse());
        },
        (_, error) => console.log('Error loading experiences:', error)
      );
    });
  };

  const handleAddExperience = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (granted) {
      setIsAddModalVisible(true);
    }
  };

  const handleChooseImage = async () => {
    const imageResult = await ImagePicker.launchImageLibraryAsync();
    if (!imageResult.canceled) {
      setSelectedImage(imageResult.assets[0].uri);
    }
  };

  const handleSaveExperience = () => {
    Keyboard.dismiss();

    if (selectedImage && title && description) {
      const experience: Experience = {
        id: Date.now().toString(),
        title,
        date: new Date().toISOString(),
        description,
        photo: selectedImage,
      };
      db.transaction((tx) => {
        tx.executeSql(
          'INSERT INTO experiences (id, title, date, description, photo) VALUES (?, ?, ?, ?, ?)',
          [
            experience.id,
            experience.title,
            experience.date,
            experience.description,
            experience.photo,
          ],
          () => {
            console.log('Experience added');
            setExperiences((prevExperiences) => [experience, ...prevExperiences]);
            setTitle('');
            setDescription('');
            setSelectedImage(null);
            setIsAddModalVisible(false);
          },
          (_, error) => console.log('Error adding experience:', error)
        );
      });
    }
  };

  const handleDeleteAllExperiences = () => {
    db.transaction((tx) => {
      tx.executeSql(
        'DELETE FROM experiences',
        [],
        () => {
          console.log('All experiences deleted');
          setExperiences([]);
        },
        (_, error) => console.log('Error deleting experiences:', error)
      );
    });
  };

  const handleExperiencePress = (experience: Experience) => {
    setSelectedExperience(experience);
    setIsViewModalVisible(true);
  };

  const ExperienceItem: React.FC<{ experience: Experience }> = ({ experience }) => (
    <TouchableOpacity
      style={styles.experienceItem}
      onPress={() => handleExperiencePress(experience)}
    >
      <View style={styles.experienceImageContainer}>
        <Image
          source={{ uri: experience.photo }}
          style={styles.experienceImage}
          resizeMode="cover"
        />
      </View>
      <View style={styles.experienceContent}>
        <Text style={styles.experienceTitle}>{experience.title}</Text>
        <Text style={styles.experienceDescription}>{experience.description}</Text>
        <Text style={styles.experienceDate}>
          {moment(experience.date).fromNow()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={experiences}
        renderItem={({ item }) => <ExperienceItem experience={item} />}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text>No experiences registered.</Text>}
        contentContainerStyle={styles.flatListContent}
      />
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.addButton]}
          onPress={handleAddExperience}
        >
          <Text style={{ color: '#000', fontWeight: 'bold'  }}>Add Experience</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDeleteAllExperiences}
        >
          <Text style={styles.buttonText}>Delete All</Text>
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
              <Text style={styles.modalTitle}>Add Experience</Text>
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
                      onPress={handleSaveExperience}
                    >
                      <Text style={[styles.buttonText, { color: '#000', fontWeight: 'bold' }]}>Save</Text>
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
                <TouchableOpacity
                  style={styles.chooseImageButton}
                  onPress={handleChooseImage}
                >
                  <Text style={styles.chooseImageText}>Choose Image</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={isViewModalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => setIsViewModalVisible(false)}>
          <View style={styles.modalContainer}>
            {selectedExperience && (
              <View style={styles.modalContent}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setIsViewModalVisible(false)}
                >
                  <Ionicons name="close-outline" size={24} color="#FFF" />
                </TouchableOpacity>
                <Image
                  source={{ uri: selectedExperience.photo }}
                  style={styles.selectedImage}
                  resizeMode="cover"
                />
                <Text style={styles.selectedTitle}>{selectedExperience.title}</Text>
                <Text style={styles.selectedDescription}>
                  {selectedExperience.description}
                </Text>
                <Text style={styles.selectedDate}>
                  {moment(selectedExperience.date).fromNow()}
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
  experienceItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  experienceImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
  },
  experienceImage: {
    flex: 1,
  },
  experienceContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  experienceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  experienceDescription: {
    marginTop: 8,
    color: '#FFF',
  },
  experienceDate: {
    marginTop: 8,
    color: '#888',
    textAlign: 'right',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginHorizontal: 8,
  },
  addButton: {
    backgroundColor: '#FFF',
  },
  deleteButton: {
    backgroundColor: 'red',
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
  chooseImageButton: {
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
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