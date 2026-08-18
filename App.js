import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Alert,
  Platform,
  Image,
  Dimensions,
  PixelRatio,
  Modal,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';

// Firebase Imports
import { db } from './firebaseConfig';
import { ref, push, set, onValue, get } from 'firebase/database';

// Configuração do comportamento da notificação quando o app está aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const AppContext = React.createContext(null);

const COLORS = {
  background: '#F8EFE2',
  cardBackground: '#F1E1C8',
  primary: '#B57B2F',
  primaryButton: '#C89640',
  primaryDark: '#8A5F23',
  text: '#2D1F14',
  textSecondary: '#7A664E',
  border: '#D8BC9A',
  success: '#3F7A46',
  warning: '#D18A0F',
  danger: '#B42F1A',
  googleBorder: '#BFA67C',
};

const INITIAL_MEDICINES = [];
const INITIAL_HISTORY_EVENTS = [
  { id: '1', date: '2026-08-11', title: 'Dipirona confirmada', subtitle: '08:02 • Tomado no horário correto', type: 'success' },
  { id: '2', date: '2026-08-11', title: 'SOS recebido', subtitle: '11:30 • Emergência acionada', type: 'warning' },
];

const INITIAL_PROFILE = {
  caregiver: { name: 'Carregando...', email: '', phone: '' },
  elder: { name: 'Carregando...', age: 0, condition: '' },
  display: { connected: true, battery: '100%', lastSync: 'Agora mesmo' },
};

const formatDateLabel = (date) =>
  date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375;
function normalize(size) {
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
}

// Helper to push to Firebase with timeout to avoid hanging requests
async function safePush(pathRef, data, ms = 8000) {
  const pushPromise = push(pathRef, data);
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms));
  return Promise.race([pushPromise, timeout]);
}

// Configuração de Canais para Notificação no Android
async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sos-notifications', {
      name: 'Notificações de SOS',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF0000',
      sound: 'default',
    });
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

function LoginScreen({ navigation }) {
  const { setProfile } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !senha) {
      setError('Informe e-mail e senha para entrar.');
      return;
    }

    setError('');

    try {
      const profileSnap = await get(ref(db, 'perfil/'));
      const profileData = profileSnap.val();

      if (profileData && profileData.caregiver && profileData.caregiver.email) {
        setProfile(profileData);
        navigation.replace('MainApp');
        return;
      }

      setProfile(INITIAL_PROFILE);
      navigation.replace('MainApp');
      Alert.alert('Login local', 'Perfil não encontrado no Firebase. Complete o cadastro antes de usar o app.');
    } catch (err) {
      setError('Não foi possível carregar o perfil: ' + (err?.message || 'erro desconhecido'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.scrollCenter} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <Image
            source={require('./assets/CUIDAMORE.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandSub}>Entrar com seu e-mail e senha.</Text>
        </View>

        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
          <TextInput
            placeholder="E-mail"
            placeholderTextColor={COLORS.textSecondary}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Senha"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry
            style={styles.input}
            value={senha}
            onChangeText={setSenha}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
          <Text style={styles.primaryBtnText}>Entrar</Text>
        </TouchableOpacity>

        <View style={{ height: 18 }} />
        <TouchableOpacity style={styles.googleBtn} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.googleBtnText}>Criar conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function RegisterScreen({ navigation }) {
  const { setProfile } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [elderName, setElderName] = useState('');
  const [elderAge, setElderAge] = useState('');
  const [elderCondition, setElderCondition] = useState('');
  const [error, setError] = useState('');

  const handleAuth = () => {
    if (!email || !senha || !caregiverName || !elderName || !elderAge || !elderCondition) {
      setError('Preencha todos os campos para continuar.');
      return;
    }

    const newProfile = {
      caregiver: {
        name: caregiverName,
        email,
        phone: caregiverPhone || '',
      },
      elder: {
        name: elderName,
        age: Number(elderAge),
        condition: elderCondition,
      },
      display: {
        connected: true,
        battery: '100%',
        lastSync: 'Agora mesmo',
      },
    };

    // Salva o perfil no Firebase Realtime Database
    set(ref(db, 'perfil/'), newProfile)
      .then(() => {
        setProfile(newProfile);
        navigation.navigate('MainApp');
      })
      .catch((err) => {
        setError('Erro ao salvar no Firebase: ' + err.message);
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.scrollCenter} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <Image
            source={require('./assets/CUIDAMORE.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandSub}>Cadastro do cuidador e do idoso.</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput placeholder="Nome do cuidador" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={caregiverName} onChangeText={setCaregiverName} />
        </View>
        <View style={styles.inputContainer}>
          <TextInput placeholder="Telefone do cuidador" placeholderTextColor={COLORS.textSecondary} style={styles.input} keyboardType="phone-pad" value={caregiverPhone} onChangeText={setCaregiverPhone} />
        </View>
        <View style={styles.inputContainer}>
          <TextInput placeholder="E-mail" placeholderTextColor={COLORS.textSecondary} style={styles.input} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        </View>
        <View style={styles.inputContainer}>
          <TextInput placeholder="Senha" placeholderTextColor={COLORS.textSecondary} secureTextEntry style={styles.input} value={senha} onChangeText={setSenha} />
        </View>
        <View style={styles.inputContainer}>
          <TextInput placeholder="Nome do idoso" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={elderName} onChangeText={setElderName} />
        </View>
        <View style={styles.inputContainer}>
          <TextInput placeholder="Idade do idoso" placeholderTextColor={COLORS.textSecondary} style={styles.input} keyboardType="numeric" value={elderAge} onChangeText={setElderAge} />
        </View>
        <View style={styles.inputContainer}>
          <TextInput placeholder="Condição do idoso" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={elderCondition} onChangeText={setElderCondition} />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity style={styles.primaryBtn} onPress={handleAuth}>
          <Text style={styles.primaryBtnText}>Criar Conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function HomeScreen({ navigation }) {
  const { profile, medicines, historyEvents, displayStatus, isSosActive, setIsSosActive } = useContext(AppContext);
  const [medTaken, setMedTaken] = useState(false);

  const nextMedicine = medicines.find((item) => item.status === 'Pendente') || medicines[0];

  // Simulação de acionamento manual do SOS
  const triggerSosTest = () => {
    set(ref(db, 'sos/'), true);
  };

  const resolveSos = () => {
    set(ref(db, 'sos/'), false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView style={{ paddingHorizontal: 20, flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.statusCard}>
          <View>
            <Text style={styles.statusTitle}>Status do display</Text>
            <Text style={styles.statusValue}>{displayStatus.connected ? 'Conectado' : 'Desconectado'}</Text>
            <Text style={styles.statusSubtitle}>Bateria {displayStatus.battery} · Última atualização {displayStatus.lastSync}</Text>
          </View>
          <MaterialCommunityIcons name="cast-connected" size={32} color={COLORS.primaryDark} />
        </View>

        {isSosActive ? (
          <View style={styles.sosAlertCard}>
            <Text style={styles.sosAlertTitle}>🚨 EMERGÊNCIA SOLICITADA!</Text>
            <Text style={styles.sosAlertText}>O idoso acionou o botão SOS! Verifique a situação imediatamente.</Text>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: '#FFF', marginTop: 10 }]} onPress={resolveSos}>
              <Text style={{ color: COLORS.danger, fontWeight: 'bold' }}>Marcar como Resolvido</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.sosInfoCard} onPress={triggerSosTest}>
            <Text style={styles.sosInfoText}>Nenhum SOS ativo. (Toque aqui para simular um teste SOS)</Text>
          </TouchableOpacity>
        )}

        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.homeGreeting}>Olá, {profile.elder?.name ? profile.elder.name.split(' ')[0] : 'Idoso'} 👋</Text>
            <Text style={styles.homeSub}>Como vamos cuidar hoje?</Text>
          </View>
        </View>

        {nextMedicine ? (
          <View style={styles.nextCard}>
            <Text style={styles.sectionLabel}>Próximo medicamento</Text>
            <Text style={styles.nextMedName}>{nextMedicine.name}</Text>
            <Text style={styles.nextMedSub}>{nextMedicine.dose} · {nextMedicine.quantity}</Text>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.nextTime}>{nextMedicine.time}</Text>
            </View>
            <TouchableOpacity
              style={[styles.confirmBtn, medTaken && styles.confirmBtnTaken]}
              onPress={() => setMedTaken(true)}
              disabled={medTaken}
            >
              <Text style={styles.confirmBtnText}>{medTaken ? 'Tomado ✓' : 'Confirmar que foi tomado'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.nextCard}>
            <Text style={styles.nextMedName}>Nenhum remédio pendente</Text>
          </View>
        )}

        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Remédios')}>
            <MaterialCommunityIcons name="pill" size={26} color={COLORS.primaryDark} style={styles.actionIcon} />
            <Text style={styles.actionTitle}>Meus Remédios</Text>
            <Text style={styles.actionSubtitle}>Ver todos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Histórico')}>
            <MaterialCommunityIcons name="file-document-outline" size={26} color={COLORS.primaryDark} style={styles.actionIcon} />
            <Text style={styles.actionTitle}>Histórico</Text>
            <Text style={styles.actionSubtitle}>Acompanhar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Perfil')}>
            <MaterialCommunityIcons name="account-outline" size={26} color={COLORS.primaryDark} style={styles.actionIcon} />
            <Text style={styles.actionTitle}>Perfil</Text>
            <Text style={styles.actionSubtitle}>Gerenciar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MedicinesScreen({ navigation }) {
  const { medicines, setMedicines } = useContext(AppContext);
  const [newMed, setNewMed] = useState({ name: '', dose: '', info: '', quantity: '', time: '', photo: null });
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);

  const pickMedicinePhoto = async (sourceType) => {
    try {
      setIsPickingPhoto(true);
      const permission = sourceType === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert('Permissão', 'É necessário permitir o acesso para tirar ou escolher a foto.');
        return;
      }

      const pickerResult = sourceType === 'camera'
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.75,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 0.75,
          });

      if (!pickerResult.canceled && pickerResult.assets?.[0]?.uri) {
        setNewMed((current) => ({ ...current, photo: pickerResult.assets[0].uri }));
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível acessar a foto do remédio.');
    } finally {
      setIsPickingPhoto(false);
    }
  };

  const handleAddMedicine = async () => {
    if (!newMed.name || !newMed.dose || !newMed.quantity || !newMed.time) {
      Alert.alert('Preenchimento', 'Informe nome, dose, quantidade e horário do remédio.');
      return;
    }

    const item = {
      id: Date.now().toString(),
      ...newMed,
      status: 'Pendente',
    };

    setMedicines([item, ...medicines]);
    setNewMed({ name: '', dose: '', info: '', quantity: '', time: '', photo: null });

    try {
      await safePush(ref(db, 'medicamentos/'), item, 8000);
      Alert.alert('Sucesso', 'Remédio salvo com foto e Firebase!');
    } catch (err) {
      Alert.alert('Aviso', 'Remédio salvo localmente, mas falhou ao enviar ao Firebase: ' + (err.message || 'timeout'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView style={{ paddingHorizontal: 20, paddingTop: 10, flex: 1 }}>
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>Meus Remédios</Text>
        </View>

        <View style={styles.addSection}>
          <Text style={styles.sectionLabel}>Adicionar remédio</Text>
          <View style={styles.inputContainer}><TextInput placeholder="Nome do remédio" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={newMed.name} onChangeText={(val) => setNewMed({ ...newMed, name: val })} /></View>
          <View style={styles.inputContainer}><TextInput placeholder="Dose (ex: 50mg)" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={newMed.dose} onChangeText={(val) => setNewMed({ ...newMed, dose: val })} /></View>
          <View style={styles.inputContainer}><TextInput placeholder="Quantidade" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={newMed.quantity} onChangeText={(val) => setNewMed({ ...newMed, quantity: val })} /></View>
          <View style={styles.inputContainer}><TextInput placeholder="Horário (ex: 14:00)" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={newMed.time} onChangeText={(val) => setNewMed({ ...newMed, time: val })} /></View>
          <View style={styles.inputContainer}><TextInput placeholder="Observações" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={newMed.info} onChangeText={(val) => setNewMed({ ...newMed, info: val })} /></View>

          <View style={styles.photoRow}>
            <TouchableOpacity
              style={[styles.photoBtn, isPickingPhoto && styles.photoBtnDisabled]}
              onPress={() => pickMedicinePhoto('camera')}
              disabled={isPickingPhoto}
            >
              <Text style={styles.photoBtnText}>Tirar foto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.photoBtn, isPickingPhoto && styles.photoBtnDisabled]}
              onPress={() => pickMedicinePhoto('library')}
              disabled={isPickingPhoto}
            >
              <Text style={styles.photoBtnText}>Galeria</Text>
            </TouchableOpacity>
          </View>

          {newMed.photo ? (
            <View style={styles.photoPreviewCard}>
              <Image source={{ uri: newMed.photo }} style={styles.medImagePreview} />
              <TouchableOpacity onPress={() => setNewMed((current) => ({ ...current, photo: null }))}>
                <Text style={styles.removePhotoText}>Remover foto</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleAddMedicine}>
            <Text style={styles.primaryBtnText}>Salvar Remédio</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Remédios Salvos no Firebase</Text>
        {medicines.map((item) => (
          <View key={item.id} style={styles.medCard}>
            {item.photo ? (
              <Image source={{ uri: item.photo }} style={styles.medImage} resizeMode="cover" />
            ) : null}
            <View style={{ flex: 1, marginLeft: item.photo ? 10 : 0 }}>
              <Text style={styles.medTitle}>{item.name} {item.dose}</Text>
              <Text style={styles.medSub}>{item.quantity} • {item.info}</Text>
              <Text style={styles.medTime}>{item.time}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'Tomado' ? COLORS.success : COLORS.warning }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function HistoryScreen() {
  const { historyEvents, historyDate, setHistoryDate } = useContext(AppContext);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [reasonInput, setReasonInput] = useState('');

  const selectedDateKey = historyDate.toISOString().slice(0, 10);
  const filteredEvents = historyEvents.filter((event) => event.date === selectedDateKey);

  const moveDate = (days) => {
    setHistoryDate(addDays(historyDate, days));
  };

  const saveEmergencyReason = () => {
    if (!selectedEvent) return;

    const normalizedReason = reasonInput.trim();
    setHistoryEvents((prev) =>
      prev.map((event) =>
        event.id === selectedEvent.id
          ? {
              ...event,
              reason: normalizedReason || event.reason || 'Não informado',
              subtitle: normalizedReason
                ? `${event.subtitle || 'Emergência'} • Motivo: ${normalizedReason}`
                : event.subtitle || 'Emergência registrada',
            }
          : event,
      ),
    );

    setSelectedEvent(null);
    setReasonInput('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView style={{ paddingHorizontal: 20, paddingTop: 10, flex: 1 }}>
        <Text style={styles.screenTitle}>Histórico</Text>

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity style={styles.calendarNavButton} onPress={() => moveDate(-1)}>
              <Text style={styles.calendarNavText}>Anterior</Text>
            </TouchableOpacity>

            <Text style={styles.calendarDateText}>{formatDateLabel(historyDate)}</Text>

            <TouchableOpacity style={styles.calendarNavButton} onPress={() => moveDate(1)}>
              <Text style={styles.calendarNavText}>Próximo</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.todayButton} onPress={() => setHistoryDate(new Date())}>
            <Text style={styles.todayButtonText}>Hoje</Text>
          </TouchableOpacity>
        </View>

        {filteredEvents.length === 0 ? (
          <View style={styles.emptyHistoryCard}>
            <Text style={styles.emptyHistoryText}>Nenhum evento registrado para esta data.</Text>
          </View>
        ) : (
          filteredEvents.map((event) => (
            <TouchableOpacity
              key={event.id}
              activeOpacity={event.type === 'warning' ? 0.8 : 1}
              onPress={() => {
                if (event.type === 'warning') {
                  setSelectedEvent(event);
                  setReasonInput(event.reason || '');
                }
              }}
              style={styles.historyCard}
            >
              <View style={[styles.historyMarker, event.type === 'success' ? { backgroundColor: COLORS.success } : { backgroundColor: COLORS.warning }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.historyTitle}>{event.title}</Text>
                <Text style={styles.historySubtitle}>{event.subtitle}</Text>
                {event.reason ? <Text style={styles.reasonText}>Motivo: {event.reason}</Text> : null}
                {event.type === 'warning' && !event.reason ? (
                  <Text style={styles.reasonHint}>Toque para registrar o motivo da emergência</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal transparent visible={Boolean(selectedEvent)} animationType="fade" onRequestClose={() => setSelectedEvent(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Motivo da emergência</Text>
            <Text style={styles.modalSubtitle}>{selectedEvent?.title || 'Emergência'}</Text>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder="Descreva o motivo da emergência..."
              value={reasonInput}
              onChangeText={setReasonInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedEvent(null)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEmergencyReason}>
                <Text style={styles.saveBtnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ProfileScreen() {
  const { profile, setProfile } = useContext(AppContext);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    caregiverName: profile.caregiver?.name || '',
    caregiverEmail: profile.caregiver?.email || '',
    caregiverPhone: profile.caregiver?.phone || '',
    elderName: profile.elder?.name || '',
    elderAge: String(profile.elder?.age || ''),
    elderCondition: profile.elder?.condition || '',
  });

  useEffect(() => {
    if (profile.caregiver) {
      setForm({
        caregiverName: profile.caregiver.name,
        caregiverEmail: profile.caregiver.email,
        caregiverPhone: profile.caregiver.phone,
        elderName: profile.elder.name,
        elderAge: String(profile.elder.age),
        elderCondition: profile.elder.condition,
      });
    }
  }, [profile]);

  const handleSave = () => {
    const updatedProfile = {
      caregiver: {
        name: form.caregiverName,
        email: form.caregiverEmail,
        phone: form.caregiverPhone,
      },
      elder: {
        name: form.elderName,
        age: Number(form.elderAge),
        condition: form.elderCondition,
      },
      display: profile.display || { connected: true, battery: '100%', lastSync: 'Agora' },
    };

    // Atualiza os dados no Firebase
    set(ref(db, 'perfil/'), updatedProfile)
      .then(() => {
        setProfile(updatedProfile);
        setEditing(false);
        Alert.alert('Sucesso', 'Perfil atualizado no Firebase!');
      })
      .catch((err) => Alert.alert('Erro', err.message));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView style={{ paddingHorizontal: 20, paddingTop: 10, flex: 1 }}>
        <Text style={styles.screenTitle}>Perfil do Usuário</Text>

        <View style={styles.profileCard}>
          <Text style={styles.profileSectionTitle}>Dados do Cuidador</Text>
          {editing ? (
            <>
              <TextInput style={styles.profileInput} value={form.caregiverName} onChangeText={(val) => setForm({ ...form, caregiverName: val })} placeholder="Nome" />
              <TextInput style={styles.profileInput} value={form.caregiverEmail} onChangeText={(val) => setForm({ ...form, caregiverEmail: val })} placeholder="E-mail" />
              <TextInput style={styles.profileInput} value={form.caregiverPhone} onChangeText={(val) => setForm({ ...form, caregiverPhone: val })} placeholder="Telefone" />
            </>
          ) : (
            <>
              <Text style={styles.profileLabel}>Nome: {profile.caregiver?.name}</Text>
              <Text style={styles.profileLabel}>E-mail: {profile.caregiver?.email}</Text>
              <Text style={styles.profileLabel}>Telefone: {profile.caregiver?.phone}</Text>
            </>
          )}
        </View>

        <View style={styles.profileCard}>
          <Text style={styles.profileSectionTitle}>Dados do Idoso</Text>
          {editing ? (
            <>
              <TextInput style={styles.profileInput} value={form.elderName} onChangeText={(val) => setForm({ ...form, elderName: val })} placeholder="Nome" />
              <TextInput style={styles.profileInput} value={form.elderAge} onChangeText={(val) => setForm({ ...form, elderAge: val })} placeholder="Idade" keyboardType="numeric" />
              <TextInput style={styles.profileInput} value={form.elderCondition} onChangeText={(val) => setForm({ ...form, elderCondition: val })} placeholder="Condição" />
            </>
          ) : (
            <>
              <Text style={styles.profileLabel}>Nome: {profile.elder?.name}</Text>
              <Text style={styles.profileLabel}>Idade: {profile.elder?.age} anos</Text>
              <Text style={styles.profileLabel}>Condição: {profile.elder?.condition}</Text>
            </>
          )}
        </View>

        <TouchableOpacity style={styles.smallActionBtn} onPress={() => (editing ? handleSave() : setEditing(true))}>
          <Text style={styles.smallActionBtnText}>{editing ? 'Salvar no Firebase' : 'Editar Perfil'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Início"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: COLORS.background, borderTopColor: COLORS.border },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
      }}
    >
      <Tab.Screen name="Início" component={HomeScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Remédios" component={MedicinesScreen} options={{ tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="pill" size={size} color={color} /> }} />
      <Tab.Screen name="Histórico" component={HistoryScreen} options={{ tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="history" size={size} color={color} /> }} />
      <Tab.Screen name="Perfil" component={ProfileScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [medicines, setMedicines] = useState(INITIAL_MEDICINES);
  const [historyEvents, setHistoryEvents] = useState(INITIAL_HISTORY_EVENTS);
  const [historyDate, setHistoryDate] = useState(new Date());
  const [displayStatus, setDisplayStatus] = useState(INITIAL_PROFILE.display);
  const [isSosActive, setIsSosActive] = useState(false);

  // Registra permissões de notificação ao abrir o app
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  // SINCRONIZAÇÃO EM TEMPO REAL COM FIREBASE
  useEffect(() => {
    // 1. Escuta alterações no Perfil
    const profileRef = ref(db, 'perfil/');
    const unsubscribeProfile = onValue(profileRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProfile(data);
      }
    });

    // 2. Escuta alterações na lista de Medicamentos
    const medsRef = ref(db, 'medicamentos/');
    const unsubscribeMeds = onValue(medsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedMeds = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setMedicines(loadedMeds);
      } else {
        setMedicines([]);
      }
    });

    // 3. Escuta e dispara Alerta de SOS em Tempo Real com Notificação Sonora
    const sosRef = ref(db, 'sos/');
    const unsubscribeSos = onValue(sosRef, async (snapshot) => {
      const val = snapshot.val();
      let active = false;
      let payload = null;
      if (val === true) {
        active = true;
      } else if (val && typeof val === 'object') {
        const keys = Object.keys(val || {});
        if (keys.length > 0) {
          payload = val[keys[keys.length - 1]];
          active = true;
        }
      }

      if (active) {
        setIsSosActive(true);
        const title = (payload && payload.title) || '🚨 ALERTA DE EMERGÊNCIA - SOS!';
        const body = (payload && payload.message) || 'O idoso acionou o botão de emergência no display!';
        try {
          await Notifications.scheduleNotificationAsync({
            content: { title, body, sound: 'default' },
            trigger: null,
          });
        } catch (e) {
          console.warn('Falha ao agendar notificação:', e.message || e);
        }

        const newEvent = {
          id: Date.now().toString(),
          date: new Date().toISOString().slice(0, 10),
          title,
          subtitle: (payload && payload.time ? payload.time + ' • ' : '') + 'SOS recebido',
          type: 'warning',
        };
        setHistoryEvents((prev) => [newEvent, ...prev]);
      } else {
        setIsSosActive(false);
      }
    });

    return () => {
      unsubscribeProfile();
      unsubscribeMeds();
      unsubscribeSos();
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        profile,
        setProfile,
        medicines,
        setMedicines,
        historyEvents,
        setHistoryEvents,
        historyDate,
        setHistoryDate,
        displayStatus,
        setDisplayStatus,
        isSosActive,
        setIsSosActive,
      }}
    >
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="MainApp" component={TabNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollCenter: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 30 },
  logoContainer: { alignItems: 'center', marginBottom: 30 },
  logoImage: {
    width: 220,
    height: 120,
    marginBottom: 10,
  },
  brandTitle: { fontSize: normalize(32), fontWeight: 'bold', color: COLORS.text, marginTop: 5 },
  brandSub: { fontSize: normalize(14), color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBackground, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 12 },
  input: { flex: 1, fontSize: normalize(15), color: COLORS.text },
  primaryBtn: { backgroundColor: COLORS.primaryButton, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  primaryBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: normalize(16) },
  googleBtn: { borderWidth: 1, borderColor: COLORS.googleBorder, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  googleBtnText: { color: COLORS.text, fontWeight: '600', fontSize: normalize(14) },
  errorText: { color: COLORS.danger, fontSize: normalize(13), marginBottom: 10 },
  statusCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.cardBackground, borderRadius: 12, padding: 16, marginTop: 15 },
  statusTitle: { fontSize: normalize(12), color: COLORS.textSecondary },
  statusValue: { fontSize: normalize(18), fontWeight: 'bold', color: COLORS.text },
  statusSubtitle: { fontSize: normalize(11), color: COLORS.textSecondary, marginTop: 2 },
  sosAlertCard: { backgroundColor: COLORS.danger, borderRadius: 12, padding: 15, marginTop: 12 },
  sosAlertTitle: { color: '#FFF', fontWeight: 'bold', fontSize: normalize(16) },
  sosAlertText: { color: '#FFF', fontSize: normalize(13), marginTop: 2 },
  sosInfoCard: { backgroundColor: COLORS.cardBackground, borderRadius: 12, padding: 12, marginTop: 12, alignItems: 'center' },
  sosInfoText: { color: COLORS.textSecondary, fontSize: normalize(13) },
  homeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  homeGreeting: { fontSize: normalize(22), fontWeight: 'bold', color: COLORS.text },
  homeSub: { fontSize: normalize(14), color: COLORS.textSecondary },
  nextCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 16, marginTop: 15 },
  sectionLabel: { fontSize: normalize(13), color: COLORS.textSecondary, fontWeight: '600', marginBottom: 4 },
  nextMedName: { fontSize: normalize(20), fontWeight: 'bold', color: COLORS.text },
  nextMedSub: { fontSize: normalize(14), color: COLORS.textSecondary },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  nextTime: { fontSize: normalize(14), color: COLORS.textSecondary, fontWeight: '500' },
  confirmBtn: { backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  confirmBtnTaken: { backgroundColor: COLORS.success },
  confirmBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: normalize(14) },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 20 },
  actionCard: { width: '48%', backgroundColor: COLORS.cardBackground, borderRadius: 14, padding: 15, marginBottom: 12 },
  actionIcon: { marginBottom: 8 },
  actionTitle: { fontSize: normalize(15), fontWeight: 'bold', color: COLORS.text },
  actionSubtitle: { fontSize: normalize(12), color: COLORS.textSecondary },
  screenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  screenTitle: { fontSize: normalize(20), fontWeight: 'bold', color: COLORS.text },
  addSection: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 16 },
  medCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBackground, borderRadius: 14, padding: 14, marginTop: 10 },
  medTitle: { fontSize: normalize(16), fontWeight: 'bold', color: COLORS.text },
  medSub: { fontSize: normalize(12), color: COLORS.textSecondary },
  medTime: { fontSize: normalize(12), color: COLORS.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#FFF', fontSize: normalize(11), fontWeight: 'bold' },
  photoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 },
  photoBtn: { flex: 1, backgroundColor: COLORS.primaryDark, paddingVertical: 10, borderRadius: 10, marginHorizontal: 4, alignItems: 'center' },
  photoBtnDisabled: { opacity: 0.7 },
  photoBtnText: { color: '#FFF', fontWeight: '700', fontSize: normalize(12) },
  photoPreviewCard: { alignItems: 'center', marginBottom: 12 },
  medImagePreview: { width: '100%', height: 120, borderRadius: 12, marginBottom: 6 },
  removePhotoText: { color: COLORS.danger, fontWeight: 'bold', fontSize: normalize(12) },
  medImage: { width: 60, height: 60, borderRadius: 10 },
  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBackground, borderRadius: 12, padding: 14, marginTop: 10 },
  historyMarker: { width: 8, height: 40, borderRadius: 4, marginRight: 12 },
  historyTitle: { fontSize: normalize(15), fontWeight: 'bold', color: COLORS.text },
  historySubtitle: { fontSize: normalize(12), color: COLORS.textSecondary },
  reasonText: { fontSize: normalize(11), color: COLORS.primaryDark, marginTop: 6, fontWeight: '600' },
  reasonHint: { fontSize: normalize(11), color: COLORS.primary, marginTop: 6, fontWeight: '600' },
  calendarCard: { backgroundColor: COLORS.cardBackground, borderRadius: 14, padding: 12, marginBottom: 12 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  calendarNavButton: { backgroundColor: COLORS.primaryButton, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  calendarNavText: { color: '#FFF', fontWeight: '600', fontSize: normalize(12) },
  calendarDateText: { fontSize: normalize(14), fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  todayButton: { backgroundColor: '#FFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  todayButtonText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: normalize(12) },
  emptyHistoryCard: { backgroundColor: COLORS.cardBackground, borderRadius: 12, padding: 18, marginTop: 12, alignItems: 'center' },
  emptyHistoryText: { color: COLORS.textSecondary, fontSize: normalize(13) },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', backgroundColor: '#FFF', borderRadius: 16, padding: 18 },
  modalTitle: { fontSize: normalize(18), fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  modalSubtitle: { fontSize: normalize(13), color: COLORS.textSecondary, marginBottom: 12 },
  modalInput: { backgroundColor: '#F9F3EA', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, minHeight: 120, textAlignVertical: 'top', padding: 12, color: COLORS.text },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginRight: 10 },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '700' },
  saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontWeight: '700' },
  profileCard: { backgroundColor: COLORS.cardBackground, borderRadius: 14, padding: 16, marginBottom: 12 },
  profileSectionTitle: { fontSize: normalize(16), fontWeight: 'bold', color: COLORS.text, marginBottom: 10 },
  profileInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: normalize(14), marginBottom: 8, color: COLORS.text },
  profileLabel: { fontSize: normalize(13), color: COLORS.text, marginTop: 4 },
  smallActionBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  smallActionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: normalize(13) },
});