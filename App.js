import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  Text,
  View,
  Animated,
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
import createStyles from './styles';
import {
  addDays,
  formatBrazilTime,
  formatDateLabel,
  formatTimeInput,
  getTimingLabel,
  isValidTime,
  toLocalDateKey,
} from './utils';

import { auth, db, storage } from './firebaseConfig';
import {
  accountPath,
  FIREBASE_SCHEMA_VERSION,
  familyDataPath,
  migrateLegacyFamilyData,
  PRIMARY_FAMILY_ID,
  userPath,
} from './firebaseSchema';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { ref, push, set, update, onValue } from 'firebase/database';
import { getDownloadURL, ref as storageRef, uploadString } from 'firebase/storage';

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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375;
function normalize(size) {
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
}

function medicineTakenToday(medicine, dateKey) {
  if (medicine.status !== 'Tomado') return false;
  if (medicine.lastTakenDate) return medicine.lastTakenDate === dateKey;
  if (!medicine.lastTakenAt) return false;

  const takenAt = new Date(medicine.lastTakenAt);
  return !Number.isNaN(takenAt.getTime()) && toLocalDateKey(takenAt) === dateKey;
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
  const { setAccount, setProfile, setGuestMode } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [elderName, setElderName] = useState('');
  const [elderAge, setElderAge] = useState('');
  const [elderCondition, setElderCondition] = useState('');
  const [error, setError] = useState('');

  const handleAuth = async () => {
    if (!email.trim() || !senha || !caregiverName.trim() || !caregiverPhone.trim() || !elderName.trim() || !elderAge || !elderCondition.trim()) {
      setError('Preencha todos os campos obrigatórios.');
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

    const newAccount = {
      accountType: 'familia',
      caregiver: {
        name: caregiverName,
        email: email.trim().toLowerCase(),
        phone: caregiverPhone || '',
      },
      schemaVersion: FIREBASE_SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
    };
    const newProfile = {
      elderId: PRIMARY_FAMILY_ID,
      elder: {
        name: elderName,
        age: Number(elderAge),
        condition: elderCondition,
      },
      device: { uid: '', verified: false },
      onboardingCompleted: false,
    };

    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), senha);
      await update(ref(db), {
        [accountPath(credential.user.uid)]: newAccount,
        [familyDataPath(credential.user.uid, PRIMARY_FAMILY_ID, 'perfil')]: newProfile,
        [familyDataPath(credential.user.uid, PRIMARY_FAMILY_ID, 'status')]: {
          display: { connected: true, battery: '100%', lastSync: 'Agora mesmo' },
        },
      });
      setGuestMode(false);
      setAccount(newAccount);
      setProfile({
        ...newProfile,
        caregiver: newAccount.caregiver,
        display: { connected: true, battery: '100%', lastSync: 'Agora mesmo' },
      });
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
          <Text style={styles.helperText}>Depois de criar sua conta, você poderá parear o ESP32 pelo UID da conta Firebase exclusiva do dispositivo.</Text>

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
  const { currentUser, isGuest, profile, activeFamilyId, familyMembers, setProfile, setGuestMode } = useContext(AppContext);
  const [visible, setVisible] = useState(false);
  const menuItems = [
    { label: 'Início', icon: 'home-outline', route: 'Início' },
    { label: 'Meus remédios', icon: 'pill', route: 'Remédios' },
    { label: 'Histórico', icon: 'history', route: 'Histórico' },
    { label: 'Perfil', icon: 'account-outline', route: 'Perfil' },
    ...(isGuest && !currentUser ? [{ label: 'Criar uma conta', icon: 'account-plus-outline', route: 'Register', stack: true }] : []),
    ...(!isGuest && currentUser ? [{ label: 'Sair da conta', icon: 'logout', action: 'logout' }] : []),
  ];

  const activeFamily = familyMembers.find((family) => family.id === activeFamilyId);
  const handleMenuPress = (item) => {
    setVisible(false);
    if (item.action === 'logout') {
      Alert.alert('Sair da conta', 'Tem certeza que deseja voltar para a tela de login?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => { signOut(auth); setProfile(INITIAL_PROFILE); setGuestMode(false); navigation.getParent()?.replace('Login'); } },
      ]);
      return;
    }
    item.stack ? navigation.getParent()?.navigate(item.route) : navigation.navigate(item.route);
  };

  return (
    <>
      <TouchableOpacity style={styles.menuButton} onPress={() => setVisible(true)} accessibilityLabel="Abrir menu">
        <Ionicons name="ellipsis-vertical" size={22} color={COLORS.text} />
      </TouchableOpacity>
      <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.sideMenu}>
            <Text style={styles.sideMenuKicker}>CUIDA+</Text>
            <Text style={styles.sideMenuTitle}>Seu cuidado</Text>
            <View style={styles.menuProfileCard}>
              <View style={styles.menuProfileIcon}><Ionicons name="heart" size={18} color="#FFF" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuProfileName}>{activeFamily?.name || profile.elder?.name || 'Familiar principal'}</Text>
                <Text style={styles.menuProfileText}>{isGuest ? 'Modo visitante' : 'Acompanhamento ativo'}</Text>
              </View>
            </View>
            {menuItems.map((item) => (
              <TouchableOpacity key={item.route || item.action} style={styles.sideMenuItem} onPress={() => handleMenuPress(item)}>
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

function FamilyModeButton() {
  const { currentUser, isGuest, activeFamilyId, familyMembers, setActiveFamilyId, addFamily } = useContext(AppContext);
  const [visible, setVisible] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [condition, setCondition] = useState('');

  if (isGuest || !currentUser) return null;

  const activeFamily = familyMembers.find((family) => family.id === activeFamilyId);

  const handleAddFamily = async () => {
    if (!name.trim() || !age.trim() || !condition.trim()) {
      Alert.alert('Preenchimento', 'Informe nome, idade e condição.');
      return;
    }
    try {
      await addFamily({ name: name.trim(), age: Number(age), condition: condition.trim() });
      setName('');
      setAge('');
      setCondition('');
      setAdding(false);
      Alert.alert('Familiar adicionado', 'Agora você pode alternar entre os familiares pelo Modo família.');
    } catch (error) {
      Alert.alert('Erro', error.message || 'Não foi possível adicionar o familiar.');
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.familyModeButton} onPress={() => setVisible(true)} accessibilityLabel="Abrir modo família">
        <Ionicons name="people-outline" size={18} color={COLORS.primaryDark} />
        <Text style={styles.familyModeButtonText}>{activeFamily?.name || 'Modo família'}</Text>
      </TouchableOpacity>
      <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.familyModalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Modo família</Text>
            <Text style={styles.modalSubtitle}>Escolha qual familiar você quer acompanhar.</Text>
            {familyMembers.map((family) => (
              <TouchableOpacity key={family.id} style={[styles.familyOption, family.id === activeFamilyId && styles.familyOptionActive]} onPress={() => { setActiveFamilyId(family.id); setVisible(false); }}>
                <Ionicons name={family.id === activeFamilyId ? 'radio-button-on' : 'radio-button-off'} size={20} color={COLORS.primaryDark} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.familyOptionName}>{family.name}</Text>
                  <Text style={styles.familyOptionDetails}>ID: {family.elderId || family.id} · {family.age} anos • {family.condition}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {adding ? (
              <View style={styles.familyForm}>
                <TextInput style={styles.profileInput} placeholder="Nome do familiar" value={name} onChangeText={setName} />
                <TextInput style={styles.profileInput} placeholder="Idade" keyboardType="numeric" value={age} onChangeText={setAge} />
                <TextInput style={styles.profileInput} placeholder="Condição de saúde" value={condition} onChangeText={setCondition} />
                <Text style={styles.helperText}>O ESP32 pode ser pareado depois, pelo perfil do familiar.</Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setAdding(false)}><Text style={styles.cancelBtnText}>Cancelar</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleAddFamily}><Text style={styles.saveBtnText}>Adicionar</Text></TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.addFamilyButton} onPress={() => setAdding(true)}>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.primaryDark} />
                <Text style={styles.addFamilyButtonText}>Adicionar familiar</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const TUTORIAL_STEPS = [
  {
    title: 'Bem-vindo ao CUIDA+',
    text: 'Parabéns por concluir o cadastro. Vamos conhecer rapidamente as principais funções para cuidar da rotina com mais segurança.',
    route: 'Início',
  },
  {
    title: 'Tela inicial',
    text: 'Aqui você acompanha o próximo medicamento, confirma quando ele foi tomado e vê o status do dispositivo. O dispositivo físico do TCC ficará responsável pelo SOS.',
    route: 'Início',
  },
  {
    title: 'Meus remédios',
    text: 'Cadastre nome, dose, quantidade, duração, horário e uma foto. A lista abaixo reúne sua rotina para facilitar a conferência diária.',
    route: 'Remédios',
  },
  {
    title: 'Histórico e relatório',
    text: 'No histórico você acompanha as tomadas, identifica atrasos ou adiantamentos e consulta relatórios de 1 semana, 2 semanas ou 1 mês.',
    route: 'Histórico',
  },
  {
    title: 'Perfil do usuário',
    text: 'No perfil você pode editar os dados do cuidador e do idoso sempre que houver alguma mudança.',
    route: 'Perfil',
  },
  {
    title: 'Tudo pronto',
    text: 'Agora você já conhece o CUIDA+. Use o menu de três pontinhos para alternar entre as áreas e acompanhar o cuidado todos os dias.',
    route: 'Início',
  },
];

function TutorialOverlay({ visible, currentStep, onNext, onSkip }) {
  if (!visible) return null;
  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  return (
    <View style={styles.tutorialOverlay}>
      <View style={styles.tutorialCard}>
        <View style={styles.tutorialProgress}>
          {TUTORIAL_STEPS.map((item, index) => <View key={item.title} style={[styles.tutorialDot, index === currentStep && styles.tutorialDotActive]} />)}
        </View>
        <Text style={styles.tutorialKicker}>GUIA DO CUIDADOR</Text>
        <Text style={styles.tutorialTitle}>{step.title}</Text>
        <Text style={styles.tutorialText}>{step.text}</Text>
        <Text style={styles.tutorialHint}>Use os três pontinhos na lateral esquerda para abrir esta área.</Text>
        <View style={styles.tutorialActions}>
          <TouchableOpacity onPress={onSkip} style={styles.tutorialSkipButton}>
            <Text style={styles.tutorialSkipText}>Pular tutorial</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onNext} style={styles.tutorialNextButton}>
            <Text style={styles.tutorialNextText}>{isLastStep ? 'Começar a usar' : 'Próximo'}</Text>
            <Ionicons name={isLastStep ? 'checkmark' : 'arrow-forward'} size={17} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function HomeScreen({ navigation }) {
  const { profile, medicines, deviceStatus, todayKey, currentUser, isGuest, familyPath, firebaseConnected, firebaseError } = useContext(AppContext);
  const entrance = useRef(new Animated.Value(0)).current;

  const requireAccount = () => {
    Alert.alert('Conta necessária', 'Crie uma conta para salvar dados, confirmar remédios e usar o dispositivo.', [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Criar conta', onPress: () => navigation.getParent()?.navigate('Register') },
    ]);
  };

  const todayMedicines = medicines.map((item) => ({
    ...item,
    takenToday: medicineTakenToday(item, todayKey),
  }));
  const nextMedicine = todayMedicines
    .filter((item) => !item.takenToday)
    .sort((first, second) => first.time.localeCompare(second.time))[0];
  const takenCount = todayMedicines.filter((item) => item.takenToday).length;
  const routineProgress = medicines.length ? Math.round((takenCount / medicines.length) * 100) : 0;
  const deviceLastSeen = Number(deviceStatus?.lastSeen);
  const deviceOnline = Number.isFinite(deviceLastSeen) && Date.now() - deviceLastSeen < 180000;
  const deviceLastSeenLabel = deviceLastSeen
    ? new Date(deviceLastSeen).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : 'ainda sem comunicação';
  const deviceStateLabels = {
    online: 'Conectado e aguardando atividade',
    reminder: `Lembrete ativo${deviceStatus?.medicineName ? `: ${deviceStatus.medicineName}` : ''}`,
    lid_open: '1ª verificação: tampa aberta',
    ir_detected: '2ª verificação: retirada detectada pelo sensor IR',
    dose_taken: 'Dose registrada pelo ESP32',
    sos: 'SOS enviado pelo ESP32',
  };
  const deviceStateLabel = deviceStateLabels[deviceStatus?.state] || '';

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      friction: 8,
      tension: 45,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const confirmMedicine = async () => {
    if (isGuest) {
      requireAccount();
      return;
    }
    if (!nextMedicine || !currentUser) return;
    const takenAt = new Date().toISOString();
    const takenDate = toLocalDateKey(new Date(takenAt));
    const timing = getTimingLabel(nextMedicine.time, takenAt);
    const event = {
      date: takenDate,
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
      const eventRef = push(ref(db, familyPath('historico')));
      if (!eventRef.key) throw new Error('Não foi possível criar a chave do histórico.');
      await update(ref(db), {
        [`${familyPath('medicamentos')}/${nextMedicine.id}/status`]: 'Tomado',
        [`${familyPath('medicamentos')}/${nextMedicine.id}/lastTakenAt`]: takenAt,
        [`${familyPath('medicamentos')}/${nextMedicine.id}/lastTakenDate`]: takenDate,
        [`${familyPath('historico')}/${eventRef.key}`]: event,
      });
    } catch (error) {
      Alert.alert('Erro', `Não foi possível registrar a tomada no Firebase: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <Animated.ScrollView style={{ paddingHorizontal: 20, flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.screenHeader}>
          <View style={styles.screenHeaderLeft}><SideMenuButton navigation={navigation} /><Text style={styles.screenTitle}>Início</Text></View>
          <FamilyModeButton />
        </View>
        {isGuest ? <View style={styles.guestBanner}><Ionicons name="information-circle-outline" size={20} color={COLORS.primaryDark} /><Text style={styles.guestBannerText}>Modo visitante: você pode conhecer o app, mas precisa criar uma conta para salvar e confirmar informações.</Text></View> : null}
        <Animated.View style={[styles.homeHero, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
          <View style={styles.heroOrb}><Ionicons name="heart" size={24} color="#FFF" /></View>
          <Text style={styles.heroEyebrow}>CUIDADO COM PRESENÇA</Text>
          <Text style={styles.heroTitle}>Olá, {profile.elder?.name ? profile.elder.name.split(' ')[0] : 'cuidador'}</Text>
          <Text style={styles.heroSubtitle}>Um pequeno acompanhamento hoje faz uma grande diferença.</Text>
        </Animated.View>
        <View style={styles.statusCard}>
          <View>
            <Text style={styles.statusTitle}>Status do ESP32</Text>
            <Text style={styles.statusValue}>{deviceOnline ? 'Conectado' : 'Sem comunicação'}</Text>
            <Text style={styles.statusSubtitle}>Último contato: {deviceLastSeenLabel}{deviceStatus?.wifiRssi != null ? ` · Wi-Fi ${deviceStatus.wifiRssi} dBm` : ''}</Text>
            {deviceStateLabel ? <Text style={styles.statusSubtitle}>Etapa: {deviceStateLabel}</Text> : null}
            <Text style={styles.statusSubtitle}>Firebase: {firebaseConnected === null ? 'verificando...' : firebaseConnected ? 'conectado' : 'desconectado'}</Text>
            {firebaseError ? <Text style={[styles.statusSubtitle, { color: COLORS.danger }]}>{firebaseError}</Text> : null}
          </View>
          <MaterialCommunityIcons name="cast-connected" size={32} color={COLORS.primaryDark} />
        </View>

        <Animated.View style={[styles.routineCard, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
          <View style={styles.routineCardHeader}>
            <View style={styles.routineIcon}><Ionicons name="sparkles-outline" size={20} color="#FFF" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.routineTitle}>Rotina de hoje</Text>
                <Text style={styles.routineSubtitle}>{medicines.length ? `${takenCount} de ${medicines.length} doses confirmadas hoje` : 'Adicione um remédio para começar'}</Text>
            </View>
            <Text style={styles.routinePercent}>{routineProgress}%</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${routineProgress}%` }]} /></View>
        </Animated.View>

        {nextMedicine ? (
          <View style={styles.nextCard}>
            <View style={styles.nextCardHeader}>
              <View><Text style={styles.sectionLabel}>PRÓXIMO PASSO</Text><Text style={styles.nextMedName}>{nextMedicine.name}</Text></View>
              <View style={styles.nextTimeBadge}><Ionicons name="time-outline" size={16} color="#FFF" /><Text style={styles.nextTimeBadgeText}>{nextMedicine.time}</Text></View>
            </View>
            <Text style={styles.nextMedSub}>{nextMedicine.dose} · {nextMedicine.quantity}</Text>
            <View style={styles.timeRow}>
              <Text style={styles.nextHint}>Quando confirmar, o histórico será atualizado automaticamente.</Text>
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
            <Ionicons name="checkmark-circle-outline" size={28} color={COLORS.success} />
            <Text style={styles.nextMedName}>Nenhum remédio pendente</Text>
            <Text style={styles.nextHint}>Sua rotina está em dia por enquanto.</Text>
          </View>
        )}

      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function MedicinesScreen({ navigation }) {
  const { medicines, currentUser, isGuest, familyPath } = useContext(AppContext);
  const [newMed, setNewMed] = useState({
    name: '',
    dose: '',
    info: '',
    quantity: '',
    duration: '',
    time: '',
    photo: null,
    photoBase64: null,
    photoMimeType: null,
  });
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [isSavingMedicine, setIsSavingMedicine] = useState(false);

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
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 0.75,
            base64: true,
          });

      const asset = pickerResult.assets?.[0];
      if (!pickerResult.canceled && asset?.uri) {
        setNewMed((current) => ({
          ...current,
          photo: asset.uri,
          photoBase64: asset.base64 || null,
          photoMimeType: asset.mimeType || 'image/jpeg',
        }));
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível acessar a foto do remédio.');
    } finally {
      setIsPickingPhoto(false);
    }
  };

  const handleAddMedicine = async () => {
    if (isSavingMedicine) return;
    if (isGuest) {
      Alert.alert('Conta necessária', 'Crie uma conta para cadastrar e salvar medicamentos.');
      return;
    }
    if (!currentUser) {
      Alert.alert('Conta necessária', 'Entre em uma conta para cadastrar e salvar medicamentos.');
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

    setIsSavingMedicine(true);
    try {
      const medicineRef = push(ref(db, familyPath('medicamentos')));

      if (!medicineRef.key) {
        throw new Error('Não foi possível criar a chave do medicamento.');
      }

      const item = {
        id: medicineRef.key,
        name: newMed.name.trim(),
        dose: newMed.dose.trim(),
        info: newMed.info.trim(),
        quantity: newMed.quantity.trim(),
        duration: newMed.duration.trim(),
        time: newMed.time,
        photo: null,
        status: 'Pendente',
        createdAt: new Date().toISOString(),
      };

      await set(medicineRef, item);
      setNewMed({
        name: '',
        dose: '',
        info: '',
        quantity: '',
        duration: '',
        time: '',
        photo: null,
        photoBase64: null,
        photoMimeType: null,
      });
      if (newMed.photo) {
        try {
          if (!newMed.photoBase64) {
            throw new Error('O aplicativo não conseguiu preparar os dados da foto. Escolha a imagem novamente.');
          }
          const photoRef = storageRef(
            storage,
            `${familyPath('medicamentos')}/${medicineRef.key}/foto`,
          );
          const photoDataUrl = `data:${newMed.photoMimeType || 'image/jpeg'};base64,${newMed.photoBase64}`;
          await uploadString(photoRef, photoDataUrl, 'data_url');
          const photoUrl = await getDownloadURL(photoRef);
          await update(medicineRef, { photo: photoUrl });
          Alert.alert('Sucesso', 'Remédio e foto salvos no Firebase.');
        } catch (photoError) {
          console.error('Medicine photo upload failed after medicine was saved:', photoError);
          Alert.alert(
            'Remédio cadastrado',
            `O remédio foi salvo, mas a foto não pôde ser enviada. Verifique se o Firebase Storage está configurado. Detalhe: ${photoError.message || 'erro desconhecido'}`,
          );
        }
      } else {
        Alert.alert('Sucesso', 'Remédio salvo no Firebase.');
      }
    } catch (err) {
      Alert.alert('Erro', `Não foi possível salvar o remédio no Firebase: ${err.message || 'erro desconhecido'}`);
    } finally {
      setIsSavingMedicine(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView style={{ paddingHorizontal: 20, paddingTop: 10, flex: 1 }}>
        <View style={styles.screenHeader}>
          <View style={styles.screenHeaderLeft}><SideMenuButton navigation={navigation} /><Text style={styles.screenTitle}>Meus Remédios</Text></View>
          <FamilyModeButton />
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
              <TouchableOpacity onPress={() => setNewMed((current) => ({ ...current, photo: null, photoBase64: null, photoMimeType: null }))}>
                <Text style={styles.removePhotoText}>Remover foto</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleAddMedicine} disabled={isSavingMedicine}>
            <Text style={styles.primaryBtnText}>{isSavingMedicine ? 'Salvando...' : 'Salvar Remédio'}</Text>
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
            <View style={[styles.statusBadge, { backgroundColor: medicineTakenToday(item, toLocalDateKey(new Date())) ? COLORS.success : COLORS.warning }]}>
              <Text style={styles.statusText}>{medicineTakenToday(item, toLocalDateKey(new Date())) ? 'Tomado hoje' : 'Pendente'}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function HistoryScreen({ navigation }) {
  const { historyEvents, historyDate, setHistoryDate, setHistoryEvents, currentUser, isGuest, familyPath } = useContext(AppContext);
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

  const saveEmergencyReason = async () => {
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
    if (!currentUser) {
      Alert.alert('Conta necessária', 'Entre em uma conta para registrar informações no histórico.');
      return;
    }

    try {
      await update(ref(db, `${familyPath('historico')}/${selectedEvent.id}`), {
        reason: updatedEvent.reason,
        subtitle: updatedEvent.subtitle,
      });
    } catch (error) {
      Alert.alert('Erro', `Não foi possível atualizar o histórico no Firebase: ${error.message}`);
      return;
    }

    setHistoryEvents((prev) =>
      prev.map((event) => event.id === selectedEvent.id ? updatedEvent : event),
    );
    setSelectedEvent(null);
    setReasonInput('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView style={{ paddingHorizontal: 20, paddingTop: 10, flex: 1 }}>
        <View style={styles.screenHeader}>
          <View style={styles.screenHeaderLeft}><SideMenuButton navigation={navigation} /><Text style={styles.screenTitle}>Histórico</Text></View>
          <FamilyModeButton />
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
          <Text style={styles.reportText}>Adiantadas: {reportSummary.early} • Atrasadas: {reportSummary.late}</Text>
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
  const { profile, setProfile, account, setAccount, currentUser, activeFamilyId, isGuest, familyPath } = useContext(AppContext);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    caregiverName: profile.caregiver?.name || '',
    caregiverEmail: profile.caregiver?.email || '',
    caregiverPhone: profile.caregiver?.phone || '',
    elderName: profile.elder?.name || '',
    elderAge: String(profile.elder?.age || ''),
    elderCondition: profile.elder?.condition || '',
    deviceUid: profile.device?.uid || '',
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
        deviceUid: profile.device?.uid || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (isGuest) {
      Alert.alert('Conta necessária', 'Crie uma conta para editar e salvar o perfil.');
      return;
    }
    if (!currentUser) {
      Alert.alert('Conta necessária', 'Entre em uma conta para editar e salvar o perfil.');
      return;
    }
    const deviceUid = form.deviceUid.trim();
    if (deviceUid && (!/^[A-Za-z0-9_-]{1,128}$/.test(deviceUid) || deviceUid === currentUser.uid)) {
      Alert.alert('UID inválido', 'Informe o UID de uma conta Firebase exclusiva do ESP32, diferente da conta do cuidador.');
      return;
    }
    const updatedProfile = {
      elderId: activeFamilyId,
      elder: {
        name: form.elderName,
        age: Number(form.elderAge),
        condition: form.elderCondition,
      },
      device: { ...(profile.device || {}), uid: deviceUid, verified: Boolean(deviceUid) },
      onboardingCompleted: profile.onboardingCompleted,
    };
    const updatedAccount = {
      ...account,
      accountType: 'familia',
      caregiver: {
        name: form.caregiverName,
        email: form.caregiverEmail,
        phone: form.caregiverPhone,
      },
      schemaVersion: FIREBASE_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    };
    const display = profile.display || { connected: true, battery: '100%', lastSync: 'Agora' };

    try {
      await update(ref(db), {
        [accountPath(currentUser.uid)]: updatedAccount,
        [familyPath('perfil')]: updatedProfile,
        [familyPath('status/display')]: display,
      });
      setAccount(updatedAccount);
      setProfile({ ...updatedProfile, caregiver: updatedAccount.caregiver, display });
      setEditing(false);
      Alert.alert('Sucesso', 'Perfil atualizado no Firebase!');
    } catch (error) {
      Alert.alert('Erro', `Não foi possível salvar o perfil: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView style={{ paddingHorizontal: 20, paddingTop: 10, flex: 1 }}>
        <View style={styles.screenHeader}>
          <View style={styles.screenHeaderLeft}><SideMenuButton navigation={navigation} /><Text style={styles.screenTitle}>Perfil do Usuário</Text></View>
          <FamilyModeButton />
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
          <Text style={styles.profileLabel}>Identificador do idoso: {profile.elderId || activeFamilyId}</Text>
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

        <View style={styles.profileCard}>
          <Text style={styles.profileSectionTitle}>Conexão do ESP32</Text>
          <Text style={styles.profileLabel}>UID do cuidador (use no firmware): {currentUser?.uid || 'indisponível'}</Text>
          <Text style={styles.profileLabel}>ID do idoso (use no firmware): {activeFamilyId}</Text>
          {editing ? (
            <>
              <TextInput
                style={styles.profileInput}
                value={form.deviceUid}
                onChangeText={(value) => setForm({ ...form, deviceUid: value.trim() })}
                placeholder="UID da conta Firebase exclusiva do ESP32"
                autoCapitalize="none"
              />
              <Text style={styles.helperText}>Crie uma conta Email/Senha exclusiva para o ESP32 no Firebase Authentication. Copie o UID dela aqui e publique as regras RTDB antes de conectar a placa.</Text>
            </>
          ) : (
            <Text style={styles.profileLabel}>{profile.device?.uid ? `Dispositivo pareado: ${profile.device.uid}` : 'Nenhum dispositivo pareado'}</Text>
          )}
        </View>

        <View style={styles.profileActions}>
          <TouchableOpacity style={styles.smallActionBtn} onPress={() => (isGuest ? Alert.alert('Conta necessária', 'Crie uma conta para editar o perfil.') : editing ? handleSave() : setEditing(true))}>
            <Text style={styles.smallActionBtnText}>{editing ? 'Salvar alterações' : 'Editar Perfil'}</Text>
          </TouchableOpacity>
          {editing ? (
            <TouchableOpacity style={styles.cancelEditBtn} onPress={() => { setEditing(false); setForm({ caregiverName: profile.caregiver?.name || '', caregiverEmail: profile.caregiver?.email || '', caregiverPhone: profile.caregiver?.phone || '', elderName: profile.elder?.name || '', elderAge: String(profile.elder?.age || ''), elderCondition: profile.elder?.condition || '', deviceUid: profile.device?.uid || '' }); }}>
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
const navigationRef = React.createRef();

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
  const [activeFamilyId, setActiveFamilyId] = useState(PRIMARY_FAMILY_ID);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [account, setAccount] = useState(null);
  const [medicines, setMedicines] = useState(INITIAL_MEDICINES);
  const [historyEvents, setHistoryEvents] = useState(INITIAL_HISTORY_EVENTS);
  const [historyDate, setHistoryDate] = useState(new Date());
  const [displayStatus, setDisplayStatus] = useState(INITIAL_PROFILE.display);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [todayKey, setTodayKey] = useState(() => toLocalDateKey(new Date()));
  const [firebaseConnected, setFirebaseConnected] = useState(null);
  const [firebaseError, setFirebaseError] = useState('');

  useEffect(() => onValue(
    ref(db, '.info/connected'),
    (snapshot) => setFirebaseConnected(snapshot.val() === true),
    (error) => setFirebaseError(`Falha na conexão com o Firebase: ${error.message}`),
  ), []);

  useEffect(() => {
    const interval = setInterval(() => setTodayKey(toLocalDateKey(new Date())), 60000);
    return () => clearInterval(interval);
  }, []);

  const addFamily = async ({ name, age, condition }) => {
    if (!currentUser) throw new Error('É necessário entrar em uma conta.');
    const familyRef = push(ref(db, userPath(currentUser.uid, 'familiares')));
    if (!familyRef.key) throw new Error('Não foi possível gerar o identificador do idoso.');
    const elderId = familyRef.key;
    const familyProfile = {
      elderId,
      elder: { name, age, condition },
      device: { uid: '', verified: false },
      onboardingCompleted: true,
    };
    await update(ref(db), {
      [familyDataPath(currentUser.uid, elderId, 'perfil')]: familyProfile,
      [familyDataPath(currentUser.uid, elderId, 'status')]: {
        display: { connected: true, battery: '100%', lastSync: 'Agora mesmo' },
      },
    });
    setActiveFamilyId(elderId);
  };

  useEffect(() => onAuthStateChanged(auth, (user) => {
    setCurrentUser(user);
    if (user) {
      setIsGuest(false);
      setActiveFamilyId(PRIMARY_FAMILY_ID);
      migrateLegacyFamilyData(db, user.uid, user.email || '').catch((error) => {
        setFirebaseError(`Não foi possível organizar os dados antigos: ${error.message}`);
      });
    } else {
      setAccount(null);
      setFirebaseError('');
    }
  }), []);

  useEffect(() => {
    if (!currentUser) {
      setAccount(null);
      return undefined;
    }

    return onValue(
      ref(db, accountPath(currentUser.uid)),
      (snapshot) => {
        const data = snapshot.val();
        setAccount(data);
        if (data?.caregiver) {
          setProfile((previous) => ({ ...previous, caregiver: data.caregiver }));
        }
      },
      (error) => setFirebaseError(`Não foi possível carregar a conta familiar: ${error.message}`),
    );
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setFamilyMembers([]);
      return undefined;
    }
    const familiesRef = ref(db, userPath(currentUser.uid, 'familiares'));
    return onValue(
      familiesRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const relatives = Object.keys(data)
          .filter((key) => data[key]?.perfil?.elder)
          .map((key) => ({
            id: key,
            elderId: data[key].perfil.elderId || key,
            name: data[key].perfil.elder.name,
            age: data[key].perfil.elder.age,
            condition: data[key].perfil.elder.condition,
          }));
        setFamilyMembers(relatives);
      },
      (error) => setFirebaseError(`Não foi possível carregar os familiares: ${error.message}`),
    );
  }, [currentUser]);

  // SINCRONIZAÇÃO EM TEMPO REAL COM FIREBASE
  useEffect(() => {
    if (!currentUser) {
      setProfile(INITIAL_PROFILE);
      setMedicines([]);
      setHistoryEvents([]);
      setDeviceStatus(null);
      setActiveFamilyId(PRIMARY_FAMILY_ID);
      return undefined;
    }

    // 1. Escuta alterações no Perfil
    const profileRef = ref(db, familyDataPath(currentUser.uid, activeFamilyId, 'perfil'));
    const unsubscribeProfile = onValue(
      profileRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setProfile({
            ...data,
            elderId: data.elderId || activeFamilyId,
            caregiver: account?.caregiver || data.caregiver || INITIAL_PROFILE.caregiver,
          });
          setDisplayStatus(data.display || INITIAL_PROFILE.display);
          setFamilyMembers((previous) => [
            { id: activeFamilyId, elderId: data.elderId || activeFamilyId, name: data.elder?.name || 'Familiar', age: data.elder?.age || '', condition: data.elder?.condition || '' },
            ...previous.filter((family) => family.id !== activeFamilyId),
          ]);
          if (data.onboardingCompleted === false) {
            setTutorialVisible(true);
          }
        } else {
          setProfile(INITIAL_PROFILE);
          setDisplayStatus(INITIAL_PROFILE.display);
        }
      },
      (error) => setFirebaseError(`Não foi possível carregar o perfil: ${error.message}`),
    );

    const statusRef = ref(db, familyDataPath(currentUser.uid, activeFamilyId, 'status'));
    const unsubscribeStatus = onValue(
      statusRef,
      (snapshot) => {
        const data = snapshot.val();
        setDeviceStatus(data?.dispositivo || null);
        if (data?.display) {
          setDisplayStatus(data.display);
          setProfile((previous) => ({ ...previous, display: data.display }));
        }
      },
      (error) => setFirebaseError(`Não foi possível carregar o status do dispositivo: ${error.message}`),
    );

    // 2. Escuta alterações na lista de Medicamentos
    const medsRef = ref(db, familyDataPath(currentUser.uid, activeFamilyId, 'medicamentos'));
    const unsubscribeMeds = onValue(
      medsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const loadedMeds = Object.keys(data).map((key) => ({
            ...data[key],
            id: key,
          }));
          setMedicines(loadedMeds);
        } else {
          setMedicines([]);
        }
      },
      (error) => setFirebaseError(`Não foi possível carregar os medicamentos: ${error.message}`),
    );

    // 3. Escuta o histórico persistido
    const historyRef = ref(db, familyDataPath(currentUser.uid, activeFamilyId, 'historico'));
    const unsubscribeHistory = onValue(
      historyRef,
      (snapshot) => {
        const data = snapshot.val();
        const loadedHistory = data ? Object.keys(data).map((key) => ({ ...data[key], id: key })) : [];
        setHistoryEvents(loadedHistory.sort((first, second) => (second.timestamp || '').localeCompare(first.timestamp || '')));
      },
      (error) => setFirebaseError(`Não foi possível carregar o histórico: ${error.message}`),
    );

    return () => {
      unsubscribeProfile();
      unsubscribeStatus();
      unsubscribeMeds();
      unsubscribeHistory();
    };
  }, [currentUser, activeFamilyId, account]);

  useEffect(() => {
    if (!currentUser || familyMembers.length === 0) return undefined;
    const unsubscribes = familyMembers.map((family) => {
      let isFirstSnapshot = true;
      const knownSosIds = new Set();
      return onValue(
        ref(db, familyDataPath(currentUser.uid, family.id, 'sos')),
        (snapshot) => {
          const sosEvents = snapshot.val() || {};
          Object.entries(sosEvents).forEach(([eventId, event]) => {
            if (!isFirstSnapshot && !knownSosIds.has(eventId) && event?.source === 'esp32') {
              Alert.alert(
                'SOS recebido',
                `${family.name || 'O idoso'} acionou o botão SOS. Abra o Histórico desse perfil para registrar o motivo.`,
              );
            }
            knownSosIds.add(eventId);
          });
          isFirstSnapshot = false;
        },
        (error) => setFirebaseError(`Não foi possível acompanhar os SOS de ${family.name || 'um familiar'}: ${error.message}`),
      );
    });
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [currentUser, familyMembers]);

  return (
    <AppContext.Provider
      value={{
        profile,
        setProfile,
        account,
        setAccount,
        currentUser,
        isGuest,
        setGuestMode: setIsGuest,
        activeFamilyId,
        familyMembers,
        setActiveFamilyId,
        addFamily,
        familyPath: (collection) => familyDataPath(currentUser?.uid, activeFamilyId, collection),
        medicines,
        setMedicines,
        historyEvents,
        setHistoryEvents,
        historyDate,
        setHistoryDate,
        displayStatus,
        setDisplayStatus,
        deviceStatus,
        todayKey,
        firebaseConnected,
        firebaseError,
      }}
    >
      <>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="MainApp" component={TabNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
      <TutorialOverlay
        visible={tutorialVisible && Boolean(currentUser)}
        currentStep={tutorialStep}
        onSkip={async () => {
          setTutorialVisible(false);
          if (currentUser) await set(ref(db, familyDataPath(currentUser.uid, activeFamilyId, 'perfil/onboardingCompleted')), true);
        }}
        onNext={async () => {
          const nextStep = tutorialStep + 1;
          if (nextStep >= TUTORIAL_STEPS.length) {
            setTutorialVisible(false);
            if (currentUser) await set(ref(db, familyDataPath(currentUser.uid, activeFamilyId, 'perfil/onboardingCompleted')), true);
            navigationRef.current?.navigate('MainApp', { screen: 'Início' });
            return;
          }
          setTutorialStep(nextStep);
          navigationRef.current?.navigate('MainApp', { screen: TUTORIAL_STEPS[nextStep].route });
        }}
      />
      </>
    </AppContext.Provider>
  );
}

const styles = createStyles({ COLORS, normalize });
