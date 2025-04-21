import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, Text, TouchableOpacity, Modal, TextInput, Button, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [newDate, setNewDate] = useState(new Date(Date.now() + 86400000)); // default tomorrow
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    loadTasks();
    requestNotificationPermission();
  }, []);

  const requestNotificationPermission = async () => {
    if (Device.isDevice) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Enable notifications to get task reminders!');
      }
    }
  };

  const scheduleNotification = async (taskText, deadline) => {
    const triggers = [
      new Date(deadline.getTime() - 86400000), // 1 day before
      new Date(deadline.getTime() - 3600000),  // 1 hour before
    ];

    for (let triggerDate of triggers) {
      if (triggerDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Reminder",
            body: taskText,
            sound: true,
          },
          trigger: triggerDate,
        });
      }
    }
  };

  const saveTasks = async (newTasks) => {
    await AsyncStorage.setItem('tasks', JSON.stringify(newTasks));
    setTasks(newTasks);
  };

  const loadTasks = async () => {
    const data = await AsyncStorage.getItem('tasks');
    if (data) {
      setTasks(JSON.parse(data));
    }
  };

  const addTask = () => {
    const task = {
      id: Date.now().toString(),
      title: newTask,
      completed: false,
      deadline: newDate,
    };
    const updatedTasks = [...tasks, task];
    saveTasks(updatedTasks);
    scheduleNotification(newTask, newDate);
    setNewTask('');
    setNewDate(new Date(Date.now() + 86400000));
    setModalVisible(false);
  };

  const markComplete = (id) => {
    const updated = tasks.map(t => t.id === id ? { ...t, completed: true } : t);
    saveTasks(updated);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks.filter(t => !t.completed)}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => markComplete(item.id)} style={styles.taskItem}>
            <Text style={styles.taskText}>{item.title}</Text>
          </TouchableOpacity>
        )}
        ListHeaderComponent={<Text style={styles.header}>Tasks</Text>}
      />
      <FlatList
        data={tasks.filter(t => t.completed)}
        keyExtractor={item => item.id + '_done'}
        renderItem={({ item }) => (
          <View style={styles.completedItem}>
            <Text style={styles.completedText}>{item.title}</Text>
          </View>
        )}
        ListHeaderComponent={<Text style={styles.subheader}>Completed</Text>}
      />
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.fab}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modal}>
          <TextInput
            placeholder="Task title"
            value={newTask}
            onChangeText={setNewTask}
            style={styles.input}
          />
          <TouchableOpacity onPress={() => setShowPicker(true)}>
            <Text style={styles.deadlineText}>Due: {newDate.toDateString()}</Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={newDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowPicker(false);
                if (selectedDate) setNewDate(selectedDate);
              }}
            />
          )}
          <Button title="Add Task" onPress={addTask} disabled={!newTask.trim()} />
          <Button title="Cancel" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, marginTop: 50 },
  taskItem: { padding: 15, backgroundColor: '#f1f1f1', marginVertical: 5, borderRadius: 8 },
  taskText: { fontSize: 16 },
  completedItem: { padding: 10, backgroundColor: '#ddd', marginVertical: 3, borderRadius: 6 },
  completedText: { fontSize: 14, textDecorationLine: 'line-through', color: '#555' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  subheader: { fontSize: 18, fontWeight: '600', marginTop: 20 },
  fab: {
    position: 'absolute',
    right: 30,
    bottom: 30,
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: { color: '#fff', fontSize: 28 },
  modal: { flex: 1, justifyContent: 'center', padding: 20 },
  input: { borderWidth: 1, borderColor: '#aaa', borderRadius: 8, padding: 10, marginBottom: 20 },
  deadlineText: { fontSize: 16, marginBottom: 20 },
});
