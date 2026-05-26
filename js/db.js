(function () {
  const STORAGE_KEY = 'gymTrackerData';

  const MUSCLE_GROUPS = [
    'Pecho',
    'Espalda',
    'Hombros',
    'Bíceps',
    'Tríceps',
    'Piernas',
    'Core',
    'Cardio'
  ];

  const PREDEFINED_EXERCISES = [
    ['Sentadilla', 'Piernas'],
    ['Sentadilla Búlgara', 'Piernas'],
    ['Peso Muerto', 'Espalda'],
    ['Peso Muerto Rumano', 'Piernas'],
    ['Press Banca', 'Pecho'],
    ['Press Banca Inclinado', 'Pecho'],
    ['Press Militar', 'Hombros'],
    ['Press Arnold', 'Hombros'],
    ['Dominadas', 'Espalda'],
    ['Remo con Barra', 'Espalda'],
    ['Remo en Polea', 'Espalda'],
    ['Curl Bíceps con Barra', 'Bíceps'],
    ['Curl Martillo', 'Bíceps'],
    ['Extensión Tríceps Polea', 'Tríceps'],
    ['Fondos', 'Tríceps'],
    ['Leg Press', 'Piernas'],
    ['Hip Thrust', 'Piernas'],
    ['Zancadas', 'Piernas'],
    ['Elevaciones Laterales', 'Hombros'],
    ['Face Pull', 'Hombros'],
    ['Plancha', 'Core'],
    ['Crunch', 'Core'],
    ['Cardio (Caminadora)', 'Cardio'],
    ['Cardio (Bicicleta)', 'Cardio'],
    ['Cardio (Elíptica)', 'Cardio']
  ];

  let fallbackCounter = 0;
  function secureSuffix() {
    if (window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint8Array(4);
      window.crypto.getRandomValues(bytes);
      return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    }
    fallbackCounter += 1;
    return `${Date.now().toString(16)}${fallbackCounter.toString(16)}`;
  }

  function makeId(prefix) {
    return `${prefix}_${Date.now()}_${secureSuffix()}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createDefaultState() {
    const exercises = PREDEFINED_EXERCISES.map(([name, muscleGroup]) => ({
      id: makeId('ex'),
      name,
      muscleGroup,
      notes: '',
      isCustom: false
    }));

    return {
      settings: {
        weightUnit: 'kg'
      },
      exercises,
      sessions: []
    };
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultState();
    }

    try {
      const parsed = JSON.parse(raw);
      parsed.settings = parsed.settings || { weightUnit: 'kg' };
      parsed.settings.weightUnit = parsed.settings.weightUnit === 'lbs' ? 'lbs' : 'kg';
      parsed.exercises = Array.isArray(parsed.exercises) ? parsed.exercises : [];
      parsed.sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];

      const names = new Set(parsed.exercises.map((exercise) => exercise.name.toLowerCase()));
      PREDEFINED_EXERCISES.forEach(([name, muscleGroup]) => {
        if (!names.has(name.toLowerCase())) {
          parsed.exercises.push({
            id: makeId('ex'),
            name,
            muscleGroup,
            notes: '',
            isCustom: false
          });
        }
      });

      return parsed;
    } catch (error) {
      console.error('Error leyendo almacenamiento local', error);
      return createDefaultState();
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function withState(updater) {
    const state = loadState();
    const result = updater(state);
    saveState(state);
    return result;
  }

  function getState() {
    return clone(loadState());
  }

  function getMuscleGroups() {
    return [...MUSCLE_GROUPS];
  }

  function updateWeightUnit(unit) {
    return withState((state) => {
      state.settings.weightUnit = unit === 'lbs' ? 'lbs' : 'kg';
      return state.settings.weightUnit;
    });
  }

  function getSessionsSorted() {
    return loadState().sessions.slice().sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }

  function getSessionById(sessionId) {
    const state = loadState();
    return state.sessions.find((session) => session.id === sessionId) || null;
  }

  function upsertSession(session) {
    return withState((state) => {
      const copy = clone(session);
      copy.id = copy.id || makeId('session');
      copy.updatedAt = Date.now();
      copy.exercises = Array.isArray(copy.exercises) ? copy.exercises : [];

      const existingIndex = state.sessions.findIndex((item) => item.id === copy.id);
      if (existingIndex >= 0) {
        state.sessions[existingIndex] = copy;
      } else {
        state.sessions.push(copy);
      }

      return copy.id;
    });
  }

  function deleteSession(sessionId) {
    return withState((state) => {
      state.sessions = state.sessions.filter((session) => session.id !== sessionId);
      return true;
    });
  }

  function addCustomExercise(payload) {
    return withState((state) => {
      const exercise = {
        id: makeId('ex'),
        name: payload.name.trim(),
        muscleGroup: payload.muscleGroup,
        notes: payload.notes?.trim() || '',
        isCustom: true
      };
      state.exercises.push(exercise);
      return exercise.id;
    });
  }

  function deleteCustomExercise(exerciseId) {
    return withState((state) => {
      state.exercises = state.exercises.filter(
        (exercise) => !(exercise.id === exerciseId && exercise.isCustom)
      );
      return true;
    });
  }

  function getExercises(filter = 'all') {
    const state = loadState();
    const list = state.exercises.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (filter === 'all') {
      return list;
    }
    return list.filter((exercise) => exercise.muscleGroup === filter);
  }

  function findLatestExerciseStats(exerciseName, excludedSessionId) {
    const sessions = getSessionsSorted();
    const lowerName = exerciseName.trim().toLowerCase();

    for (const session of sessions) {
      if (session.id === excludedSessionId) {
        continue;
      }

      const match = (session.exercises || []).find(
        (exercise) => (exercise.name || '').trim().toLowerCase() === lowerName
      );

      if (match && Array.isArray(match.sets) && match.sets.length > 0) {
        const lastSet = match.sets[match.sets.length - 1];
        return {
          date: session.date,
          reps: lastSet.reps,
          weight: lastSet.weight
        };
      }
    }

    return null;
  }

  window.DB = {
    getState,
    getMuscleGroups,
    updateWeightUnit,
    getExercises,
    getSessionsSorted,
    getSessionById,
    upsertSession,
    deleteSession,
    addCustomExercise,
    deleteCustomExercise,
    findLatestExerciseStats,
    makeId
  };
})();
