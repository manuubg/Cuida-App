import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
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
import { auth, db } from './firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { ref, push, set, update, onValue } from 'firebase/database';

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
const INITIAL_HISTORY_EVENTS = [];

const INITIAL_PROFILE = {
  caregiver: { name: 'Carregando...', email: '', phone: '' },
  elder: { name: 'Carregando...', age: 0, condition: '' },
  display: { connected: true, battery: '100%', lastSync: 'Agora mesmo' },
};

const BRAZIL_TIME_ZONE = 'America/Sao_Paulo';

const formatDateLabel = (date) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TIME_ZONE,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

const formatBrazilTime = (date) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).format(date);

const getBrazilDateParts = (date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
};

const toLocalDateKey = (date) => {
  const { year, month, day } = getBrazilDateParts(date);
  return `${year}-${month}-${day}`;
};

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

const localUriToDataUrl = async (uri) => {
  const response = await fetch(uri);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const userPath = (uid, collection) => `usuarios/${uid}/${collection}`;
const isValidTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const formatTimeInput = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

const getTimingLabel = (scheduledTime, takenAt) => {
  const [hours, minutes] = scheduledTime.split(':').map(Number);
  const currentParts = getBrazilDateParts(new Date(takenAt));
  const currentMinutes = Number(currentParts.hour || 0) * 60 + Number(currentParts.minute || 0);
  let difference = currentMinutes - (hours * 60 + minutes);
  if (difference > 720) difference -= 1440;
  if (difference < -720) difference += 1440;
  if (difference < -15) return { timing: 'early', label: 'Tomado adiantado' };
  if (difference > 15) return { timing: 'late', label: 'Tomado atrasado' };
  return { timing: 'on_time', label: 'Tomado no horário' };
};

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
  const { setProfile, setGuestMode } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !senha) {
      setError('Informe e-mail e senha para entrar.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, senha);
      setGuestMode(false);
      setProfile({ ...INITIAL_PROFILE, caregiver: { ...INITIAL_PROFILE.caregiver, email: credential.user.email } });
      navigation.replace('MainApp');
    } catch (err) {
      const messages = {
        'auth/invalid-credential': 'E-mail ou senha incorretos.',
        'auth/user-not-found': 'Não existe uma conta com este e-mail.',
        'auth/wrong-password': 'A senha está incorreta.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
        'auth/user-disabled': 'Esta conta foi desativada no Firebase.',
        'auth/network-request-failed': 'Sem conexão com a internet. Verifique a rede e tente novamente.',
      };
      setError(messages[err.code] || `Não foi possível entrar (${err.code || 'erro desconhecido'}).`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollCenter, { paddingBottom: 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

          <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={isLoading}>
            <Text style={styles.primaryBtnText}>{isLoading ? 'Entrando...' : 'Entrar'}</Text>
          </TouchableOpacity>

          <View style={{ height: 18 }} />
          <TouchableOpacity style={styles.googleBtn} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.googleBtnText}>Criar conta</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.guestButton} onPress={() => { setGuestMode(true); setProfile({ ...INITIAL_PROFILE, caregiver: { name: 'Visitante', email: '', phone: '' }, elder: { ...INITIAL_PROFILE.elder, name: 'Visitante' } }); navigation.replace('MainApp'); }}>
            <Ionicons name="eye-outline" size={18} color={COLORS.primaryDark} />
            <Text style={styles.guestButtonText}>Entrar sem criar conta</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.linkButtonText}>Esqueci minha senha</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Informe um e-mail válido.');
      setMessage('');
      return;
    }
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      setMessage('Enviamos um link para redefinir sua senha. Verifique seu e-mail.');
    } catch (err) {
      setError(err.code === 'auth/user-not-found' ? 'Não existe uma conta com este e-mail.' : 'Não foi possível enviar o e-mail de recuperação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[styles.scrollCenter, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.logoContainer}>
            <Image source={require('./assets/CUIDAMORE.png')} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.brandSub}>Recupere o acesso à sua conta.</Text>
          </View>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
            <TextInput placeholder="E-mail cadastrado" placeholderTextColor={COLORS.textSecondary} style={styles.input} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleResetPassword} disabled={isLoading}>
            <Text style={styles.primaryBtnText}>{isLoading ? 'Enviando...' : 'Enviar link de recuperação'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color={COLORS.primaryDark} />
            <Text style={styles.backButtonText}>Voltar para o login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RegisterScreen({ navigation }) {
  const { setProfile, setGuestMode } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [elderName, setElderName] = useState('');
  const [elderAge, setElderAge] = useState('');
  const [elderCondition, setElderCondition] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [error, setError] = useState('');

  const handleAuth = async () => {
    if (!email.trim() || !senha || !caregiverName.trim() || !caregiverPhone.trim() || !elderName.trim() || !elderAge || !elderCondition.trim() || !deviceCode.trim()) {
      setError('Preencha todos os campos, incluindo o código provisório do dispositivo.');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Informe um e-mail válido.');
      return;
    }

    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
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
      device: {
        code: deviceCode.trim().toUpperCase(),
        provisional: true,
        verified: false,
      },
    };

    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), senha);
      await set(ref(db, userPath(credential.user.uid, 'perfil')), newProfile);
      setGuestMode(false);
      setProfile(newProfile);
      navigation.navigate('MainApp');
    } catch (err) {
      if (err.code === 'auth/invalid-api-key' || err.code === 'auth/api-key-not-valid') {
        setError('A configuração do Firebase está com uma API key inválida. Abra o Firebase Console e copie novamente a configuração do app Web.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado.');
      } else {
        setError('Erro ao criar conta: ' + err.message);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollCenter, { paddingBottom: 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="barcode-scan" size={20} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
            <TextInput placeholder="Código provisório do dispositivo" placeholderTextColor={COLORS.textSecondary} style={styles.input} autoCapitalize="characters" value={deviceCode} onChangeText={setDeviceCode} />
          </View>
          <Text style={styles.helperText}>Por enquanto, use qualquer código para simular o dispositivo. A validação oficial será conectada quando ele existir.</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleAuth}>
            <Text style={styles.primaryBtnText}>Criar Conta</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color={COLORS.primaryDark} />
            <Text style={styles.backButtonText}>Voltar para o login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SideMenuButton({ navigation }) {
  const [visible, setVisible] = useState(false);
  const menuItems = [
    { label: 'Início', icon: 'home-outline', route: 'Início' },
    { label: 'Meus remédios', icon: 'pill', route: 'Remédios' },
    { label: 'Histórico', icon: 'history', route: 'Histórico' },
    { label: 'Perfil', icon: 'account-outline', route: 'Perfil' },
    { label: 'Criar uma conta', icon: 'account-plus-outline', route: 'Register', stack: true },
  ];

  return (
    <>
      <TouchableOpacity style={styles.menuButton} onPress={() => setVisible(true)} accessibilityLabel="Abrir menu">
        <Ionicons name="ellipsis-vertical" size={22} color={COLORS.text} />
      </TouchableOpacity>
      <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.sideMenu}>
            <Text style={styles.sideMenuTitle}>Menu</Text>
            {menuItems.map((item) => (
              <TouchableOpacity key={item.route} style={styles.sideMenuItem} onPress={() => { setVisible(false); item.stack ? navigation.getParent()?.navigate(item.route) : navigation.navigate(item.route); }}>
                <MaterialCommunityIcons name={item.icon} size={22} color={COLORS.primaryDark} />
                <Text style={styles.sideMenuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function LogoutButton({ navigation }) {
  const { setProfile, setGuestMode } = useContext(AppContext);

  const confirmLogout = () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair da conta e voltar para a tela de login?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => {
            signOut(auth);
            setProfile(INITIAL_PROFILE);
            setGuestMode(false);
            navigation.getParent()?.replace('Login');
          },
        },
      ],
    );
  };

  return (
    <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout} accessibilityRole="button">
      <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
      <Text style={styles.logoutButtonText}>Sair</Text>
    </TouchableOpacity>
  );
}

function HomeScreen({ navigation }) {
  const { profile, medicines, displayStatus, isSosActive, currentUser, isGuest } = useContext(AppContext);

  const requireAccount = () => {
    Alert.alert('Conta necessária', 'Crie uma conta para salvar dados, confirmar remédios e usar o dispositivo.', [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Criar conta', onPress: () => navigation.getParent()?.navigate('Register') },
    ]);
  };

  const nextMedicine = medicines
    .filter((item) => item.status !== 'Tomado')
    .sort((first, second) => first.time.localeCompare(second.time))[0];

  const confirmMedicine = async () => {
    if (isGuest) {
      requireAccount();
      return;
    }
    if (!nextMedicine || !currentUser) return;
    const takenAt = new Date().toISOString();
    const timing = getTimingLabel(nextMedicine.time, takenAt);
    const event = {
      date: toLocalDateKey(new Date(takenAt)),
      timestamp: takenAt,
      title: `${nextMedicine.name} confirmado`,
      subtitle: `${formatBrazilTime(new Date(takenAt))} • ${timing.label}`,
      type: 'success',
      timing: timing.timing,
      scheduledTime: nextMedicine.time,
      medicineId: nextMedicine.id,
      medicineName: nextMedicine.name,
      dose: nextMedicine.dose,
      quantity: nextMedicine.quantity,
      photo: nextMedicine.photo || null,
    };
    try {
      await update(ref(db, `${userPath(currentUser.uid, 'medicamentos')}/${nextMedicine.id}`), { status: 'Tomado', lastTakenAt: takenAt });
      await safePush(ref(db, userPath(currentUser.uid, 'historico')), event);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível registrar a tomada no Firebase.');
    }
  };

  // Simulação de acionamento manual do SOS
  const triggerSosTest = () => {
    if (isGuest) {
      requireAccount();
      return;
    }
    if (currentUser) set(ref(db, userPath(currentUser.uid, 'sos')), { active: true, time: new Date().toISOString() });
  };

  const resolveSos = () => {
    if (currentUser) set(ref(db, userPath(currentUser.uid, 'sos')), { active: false });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView style={{ paddingHorizontal: 20, flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.screenHeader}>
          <View style={styles.screenHeaderLeft}><SideMenuButton navigation={navigation} /><Text style={styles.screenTitle}>Início</Text></View>
          <LogoutButton navigation={navigation} />
        </View>
        {isGuest ? <View style={styles.guestBanner}><Ionicons name="information-circle-outline" size={20} color={COLORS.primaryDark} /><Text style={styles.guestBannerText}>Modo visitante: você pode conhecer o app, mas precisa criar uma conta para salvar e confirmar informações.</Text></View> : null}
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
              style={styles.confirmBtn}
              onPress={confirmMedicine}
            >
              <Text style={styles.confirmBtnText}>Confirmar que foi tomado</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.nextCard}>
            <Text style={styles.nextMedName}>Nenhum remédio pendente</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function MedicinesScreen({ navigation }) {
  const { medicines, currentUser, isGuest } = useContext(AppContext);
  const [newMed, setNewMed] = useState({ name: '', dose: '', info: '', quantity: '', duration: '', time: '', photo: null });
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
    if (isGuest) {
      Alert.alert('Conta necessária', 'Crie uma conta para cadastrar e salvar medicamentos.');
      return;
    }
    if (!newMed.name.trim() || !newMed.dose.trim() || !newMed.quantity.trim() || !newMed.duration.trim() || !newMed.time.trim()) {
      Alert.alert('Preenchimento', 'Nome, dose, quantidade, duração e horário são obrigatórios.');
      return;
    }

    if (!isValidTime(newMed.time)) {
      Alert.alert('Horário inválido', 'Informe o horário no formato HH:mm, por exemplo 08:30.');
      return;
    }

    try {
      let photoValue = newMed.photo || null;

      if (newMed.photo && newMed.photo.startsWith('file://')) {
        try {
          photoValue = await localUriToDataUrl(newMed.photo);
        } catch (base64Error) {
          console.warn('Falha ao converter foto para DataURL:', base64Error);
        }
      }

      const item = {
        id: Date.now().toString(),
        ...newMed,
        photo: photoValue,
        status: 'Pendente',
        createdAt: new Date().toISOString(),
      };

      await safePush(ref(db, userPath(currentUser.uid, 'medicamentos')), item, 8000);
      setNewMed({ name: '', dose: '', info: '', quantity: '', duration: '', time: '', photo: null });
      Alert.alert('Sucesso', 'Remédio salvo com foto no Firebase!');
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível salvar o remédio no Firebase: ' + (err.message || 'erro desconhecido'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView style={{ paddingHorizontal: 20, paddingTop: 10, flex: 1 }}>
        <View style={styles.screenHeader}>
          <View style={styles.screenHeaderLeft}><SideMenuButton navigation={navigation} /><Text style={styles.screenTitle}>Meus Remédios</Text></View>
          <LogoutButton navigation={navigation} />
        </View>
        {isGuest ? <View style={styles.guestBanner}><Ionicons name="lock-closed-outline" size={20} color={COLORS.primaryDark} /><Text style={styles.guestBannerText}>Modo visitante: o cadastro de medicamentos fica disponível após criar uma conta.</Text></View> : null}

        <View style={styles.addSection}>
          <Text style={styles.sectionLabel}>Adicionar remédio</Text>
          <View style={styles.inputContainer}><TextInput placeholder="Nome do remédio" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={newMed.name} onChangeText={(val) => setNewMed({ ...newMed, name: val })} /></View>
          <View style={styles.inputContainer}><TextInput placeholder="Dose (ex: 50mg)" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={newMed.dose} onChangeText={(val) => setNewMed({ ...newMed, dose: val })} /></View>
          <View style={styles.inputContainer}><TextInput placeholder="Quantidade" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={newMed.quantity} onChangeText={(val) => setNewMed({ ...newMed, quantity: val })} /></View>
          <View style={styles.inputContainer}><TextInput placeholder="Horário (HH:mm)" placeholderTextColor={COLORS.textSecondary} style={styles.input} keyboardType="numeric" maxLength={5} value={newMed.time} onChangeText={(val) => setNewMed({ ...newMed, time: formatTimeInput(val) })} /></View>
          <View style={styles.inputContainer}><TextInput placeholder="Por quanto tempo? (ex: 7 dias)" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={newMed.duration} onChangeText={(val) => setNewMed({ ...newMed, duration: val })} /></View>
          <View style={styles.inputContainer}><TextInput placeholder="Observações" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={newMed.info} onChangeText={(val) => setNewMed({ ...newMed, info: val })} /></View>

          <View style={styles.photoRow}>
            <TouchableOpacity
              style={[styles.photoBtn, isPickingPhoto && styles.photoBtnDisabled]}
              onPress={() => isGuest ? Alert.alert('Conta necessária', 'Crie uma conta para adicionar fotos.') : pickMedicinePhoto('camera')}
              disabled={isPickingPhoto}
            >
              <Text style={styles.photoBtnText}>Tirar foto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.photoBtn, isPickingPhoto && styles.photoBtnDisabled]}
              onPress={() => isGuest ? Alert.alert('Conta necessária', 'Crie uma conta para adicionar fotos.') : pickMedicinePhoto('library')}
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

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Sua rotina de medicamentos</Text>
        {medicines.map((item) => (
          <View key={item.id} style={styles.medCard}>
            {item.photo ? (
              <Image source={{ uri: item.photo }} style={styles.medImage} resizeMode="cover" />
            ) : null}
            <View style={{ flex: 1, marginLeft: item.photo ? 10 : 0 }}>
              <Text style={styles.medTitle}>{item.name} {item.dose}</Text>
              <Text style={styles.medSub}>{item.quantity} • {item.duration || 'Duração não informada'}{item.info ? ` • ${item.info}` : ''}</Text>
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

function HistoryScreen({ navigation }) {
  const { historyEvents, historyDate, setHistoryDate, setHistoryEvents, currentUser, isGuest } = useContext(AppContext);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [reasonInput, setReasonInput] = useState('');
  const [reportDays, setReportDays] = useState(7);

  const selectedDateKey = toLocalDateKey(historyDate);
  const filteredEvents = historyEvents.filter((event) => event.date === selectedDateKey);
  const reportStart = addDays(new Date(), -(reportDays - 1));
  const reportEvents = historyEvents.filter((event) => new Date(`${event.date}T00:00:00`) >= new Date(`${toLocalDateKey(reportStart)}T00:00:00`));
  const reportSummary = {
    total: reportEvents.filter((event) => event.type === 'success').length,
    onTime: reportEvents.filter((event) => event.timing === 'on_time').length,
    early: reportEvents.filter((event) => event.timing === 'early').length,
    late: reportEvents.filter((event) => event.timing === 'late').length,
    sos: reportEvents.filter((event) => event.type === 'warning').length,
  };

  const moveDate = (days) => {
    setHistoryDate((prev) => addDays(prev, days));
  };

  const saveEmergencyReason = () => {
    if (!selectedEvent) return;
    if (isGuest) {
      Alert.alert('Conta necessária', 'Crie uma conta para registrar informações no histórico.');
      return;
    }

    const normalizedReason = reasonInput.trim();
    const updatedEvent = {
      ...selectedEvent,
      reason: normalizedReason || selectedEvent.reason || 'Não informado',
      subtitle: normalizedReason
        ? `${selectedEvent.subtitle || 'Emergência'} • Motivo: ${normalizedReason}`
        : selectedEvent.subtitle || 'Emergência registrada',
    };
    setHistoryEvents((prev) =>
      prev.map((event) =>
        event.id === selectedEvent.id
          ? updatedEvent
          : event,
      ),
    );
    if (currentUser) {
      update(ref(db, `${userPath(currentUser.uid, 'historico')}/${selectedEvent.id}`), {
        reason: updatedEvent.reason,
        subtitle: updatedEvent.subtitle,
      }).catch(() => Alert.alert('Aviso', 'O motivo foi atualizado na tela, mas não no Firebase.'));
    }

    setSelectedEvent(null);
    setReasonInput('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView style={{ paddingHorizontal: 20, paddingTop: 10, flex: 1 }}>
        <View style={styles.screenHeader}>
          <View style={styles.screenHeaderLeft}><SideMenuButton navigation={navigation} /><Text style={styles.screenTitle}>Histórico</Text></View>
          <LogoutButton navigation={navigation} />
        </View>

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

        <View style={styles.reportCard}>
          <Text style={styles.sectionLabel}>Relatório de adesão</Text>
          <View style={styles.reportOptions}>
            {[7, 14, 30].map((days) => (
              <TouchableOpacity key={days} style={[styles.reportOption, reportDays === days && styles.reportOptionActive]} onPress={() => setReportDays(days)}>
                <Text style={[styles.reportOptionText, reportDays === days && styles.reportOptionTextActive]}>{days === 30 ? '1 mês' : `${days === 7 ? '1 semana' : '2 semanas'}`}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.reportText}>Doses registradas: {reportSummary.total} • No horário: {reportSummary.onTime}</Text>
          <Text style={styles.reportText}>Adiantadas: {reportSummary.early} • Atrasadas: {reportSummary.late} • SOS: {reportSummary.sos}</Text>
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

function ProfileScreen({ navigation }) {
  const { profile, setProfile, currentUser, isGuest } = useContext(AppContext);
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
    if (isGuest) {
      Alert.alert('Conta necessária', 'Crie uma conta para editar e salvar o perfil.');
      return;
    }
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
    set(ref(db, userPath(currentUser.uid, 'perfil')), updatedProfile)
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
        <View style={styles.screenHeader}>
          <View style={styles.screenHeaderLeft}><SideMenuButton navigation={navigation} /><Text style={styles.screenTitle}>Perfil do Usuário</Text></View>
          <LogoutButton navigation={navigation} />
        </View>

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

        <View style={styles.profileActions}>
          <TouchableOpacity style={styles.smallActionBtn} onPress={() => (isGuest ? Alert.alert('Conta necessária', 'Crie uma conta para editar o perfil.') : editing ? handleSave() : setEditing(true))}>
            <Text style={styles.smallActionBtnText}>{editing ? 'Salvar alterações' : 'Editar Perfil'}</Text>
          </TouchableOpacity>
          {editing ? (
            <TouchableOpacity style={styles.cancelEditBtn} onPress={() => { setEditing(false); setForm({ caregiverName: profile.caregiver?.name || '', caregiverEmail: profile.caregiver?.email || '', caregiverPhone: profile.caregiver?.phone || '', elderName: profile.elder?.name || '', elderAge: String(profile.elder?.age || ''), elderCondition: profile.elder?.condition || '' }); }}>
              <Text style={styles.cancelEditText}>Sair do modo de edição</Text>
            </TouchableOpacity>
          ) : null}
        </View>
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
        tabBarStyle: { display: 'none' },
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
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [isGuest, setIsGuest] = useState(false);
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

  useEffect(() => onAuthStateChanged(auth, (user) => {
    setCurrentUser(user);
    if (user) setIsGuest(false);
  }), []);

  // SINCRONIZAÇÃO EM TEMPO REAL COM FIREBASE
  useEffect(() => {
    if (!currentUser) {
      setProfile(INITIAL_PROFILE);
      setMedicines([]);
      setHistoryEvents([]);
      setIsSosActive(false);
      return undefined;
    }

    // 1. Escuta alterações no Perfil
    const profileRef = ref(db, userPath(currentUser.uid, 'perfil'));
    const unsubscribeProfile = onValue(profileRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProfile(data);
      }
    });

    // 2. Escuta alterações na lista de Medicamentos
    const medsRef = ref(db, userPath(currentUser.uid, 'medicamentos'));
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

    // 3. Escuta o histórico persistido
    const historyRef = ref(db, userPath(currentUser.uid, 'historico'));
    const unsubscribeHistory = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      const loadedHistory = data ? Object.keys(data).map((key) => ({ id: key, ...data[key] })) : [];
      setHistoryEvents(loadedHistory.sort((first, second) => (second.timestamp || '').localeCompare(first.timestamp || '')));
    });

    // 4. Escuta e dispara Alerta de SOS em Tempo Real com Notificação Sonora
    const sosRef = ref(db, userPath(currentUser.uid, 'sos'));
    const unsubscribeSos = onValue(sosRef, async (snapshot) => {
      const val = snapshot.val();
      const active = Boolean(val && val.active);
      const payload = val;

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
          date: toLocalDateKey(new Date()),
          timestamp: new Date().toISOString(),
          title,
          subtitle: `${formatBrazilTime(new Date())} • SOS recebido`,
          type: 'warning',
        };
        const eventKey = `sos-${String(payload?.time || Date.now()).replace(/[.#$[\]]/g, '-')}`;
        await set(ref(db, `${userPath(currentUser.uid, 'historico')}/${eventKey}`), newEvent);
      } else {
        setIsSosActive(false);
      }
    });

    return () => {
      unsubscribeProfile();
      unsubscribeMeds();
      unsubscribeHistory();
      unsubscribeSos();
    };
  }, [currentUser]);

  return (
    <AppContext.Provider
      value={{
        profile,
        setProfile,
        currentUser,
        isGuest,
        setGuestMode: setIsGuest,
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
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
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
  guestButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14 },
  guestButtonText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: normalize(13) },
  linkButton: { alignItems: 'center', paddingVertical: 14 },
  linkButtonText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: normalize(13) },
  backButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16 },
  backButtonText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: normalize(13) },
  successText: { color: COLORS.success, fontSize: normalize(13), marginBottom: 10, textAlign: 'center' },
  helperText: { color: COLORS.textSecondary, fontSize: normalize(11), lineHeight: normalize(16), marginBottom: 8 },
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
  guestBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF7E8', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, marginTop: 12 },
  guestBannerText: { flex: 1, color: COLORS.primaryDark, fontSize: normalize(12), lineHeight: normalize(17) },
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
  screenHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: COLORS.cardBackground },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(45, 31, 20, 0.28)' },
  sideMenu: { width: 255, minHeight: '100%', backgroundColor: '#FFF9F1', paddingTop: 58, paddingHorizontal: 18, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, elevation: 8 },
  sideMenuTitle: { color: COLORS.text, fontSize: normalize(21), fontWeight: 'bold', marginBottom: 20 },
  sideMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sideMenuItemText: { color: COLORS.text, fontSize: normalize(15), fontWeight: '600' },
  screenTitle: { fontSize: normalize(20), fontWeight: 'bold', color: COLORS.text },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E3B3A8', backgroundColor: '#FFF7F4' },
  logoutButtonText: { color: COLORS.danger, fontSize: normalize(13), fontWeight: '700' },
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
  calendarNavButton: { backgroundColor: COLORS.primaryButton, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, minWidth: 82 },
  calendarNavText: { color: '#FFF', fontWeight: '600', fontSize: normalize(12), textAlign: 'center' },
  calendarDateText: { flex: 1, fontSize: normalize(12), fontWeight: '700', color: COLORS.text, textAlign: 'center', marginHorizontal: 8, flexShrink: 1, numberOfLines: 2 },
  todayButton: { backgroundColor: '#FFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  todayButtonText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: normalize(12) },
  reportCard: { backgroundColor: COLORS.cardBackground, borderRadius: 12, padding: 14, marginTop: 12 },
  reportOptions: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 10 },
  reportOption: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  reportOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  reportOptionText: { color: COLORS.textSecondary, fontSize: normalize(12), fontWeight: '600' },
  reportOptionTextActive: { color: '#FFF' },
  reportText: { color: COLORS.textSecondary, fontSize: normalize(12), marginTop: 4 },
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
  profileActions: { marginTop: 10 },
  cancelEditBtn: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  cancelEditText: { color: COLORS.danger, fontWeight: '700', fontSize: normalize(13) },
});