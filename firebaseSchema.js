import { get, ref, runTransaction } from 'firebase/database';

export const FIREBASE_SCHEMA_VERSION = 2;
export const PRIMARY_FAMILY_ID = 'principal';

export const userPath = (uid, collection) => `usuarios/${uid}/${collection}`;
export const accountPath = (uid) => userPath(uid, 'conta');
export const elderPath = (uid, elderId) => userPath(uid, `familiares/${elderId}`);
export const familyDataPath = (uid, elderId, collection) => `${elderPath(uid, elderId)}/${collection}`;

async function copyLegacyValue(database, sourcePath, targetPath, transform = (value) => value) {
  const sourceSnapshot = await get(ref(database, sourcePath));
  if (!sourceSnapshot.exists()) return;

  const value = transform(sourceSnapshot.val());
  if (value === null || value === undefined) return;

  await runTransaction(
    ref(database, targetPath),
    (currentValue) => {
      if (currentValue === null) return value;
      if (
        typeof currentValue === 'object'
        && currentValue !== null
        && typeof value === 'object'
        && value !== null
        && !Array.isArray(currentValue)
        && !Array.isArray(value)
      ) {
        return { ...value, ...currentValue };
      }
      return undefined;
    },
    { applyLocally: false },
  );
}

export async function migrateLegacyFamilyData(database, uid, email = '') {
  const accountRef = ref(database, accountPath(uid));
  const accountSnapshot = await get(accountRef);
  if (accountSnapshot.child('schemaVersion').val() >= FIREBASE_SCHEMA_VERSION) return;

  const legacyProfilePath = userPath(uid, 'perfil');
  const legacyProfileSnapshot = await get(ref(database, legacyProfilePath));
  const legacyProfile = legacyProfileSnapshot.val();

  await runTransaction(
    accountRef,
    (currentValue) => {
      if (currentValue?.schemaVersion >= FIREBASE_SCHEMA_VERSION) return currentValue;
      return {
        ...currentValue,
        accountType: 'familia',
        caregiver: currentValue?.caregiver || legacyProfile?.caregiver || {
          name: 'Cuidador',
          email,
          phone: '',
        },
        updatedAt: new Date().toISOString(),
      };
    },
    { applyLocally: false },
  );

  if (legacyProfile) {
    const { caregiver, display, ...elderProfile } = legacyProfile;
    await copyLegacyValue(
      database,
      legacyProfilePath,
      familyDataPath(uid, PRIMARY_FAMILY_ID, 'perfil'),
      () => ({ ...elderProfile, elderId: PRIMARY_FAMILY_ID }),
    );
    if (display) {
      await copyLegacyValue(
        database,
        legacyProfilePath,
        familyDataPath(uid, PRIMARY_FAMILY_ID, 'status'),
        () => ({ display }),
      );
    }
  }

  await Promise.all([
    copyLegacyValue(
      database,
      userPath(uid, 'medicamentos'),
      familyDataPath(uid, PRIMARY_FAMILY_ID, 'medicamentos'),
    ),
    copyLegacyValue(
      database,
      userPath(uid, 'historico'),
      familyDataPath(uid, PRIMARY_FAMILY_ID, 'historico'),
    ),
  ]);

  await runTransaction(
    accountRef,
    (currentValue) => currentValue?.schemaVersion >= FIREBASE_SCHEMA_VERSION
      ? currentValue
      : {
          ...currentValue,
          accountType: 'familia',
          caregiver: currentValue?.caregiver || legacyProfile?.caregiver || {
            name: 'Cuidador',
            email,
            phone: '',
          },
          schemaVersion: FIREBASE_SCHEMA_VERSION,
          updatedAt: new Date().toISOString(),
        },
    { applyLocally: false },
  );
}
