(function () {
  const state = {
    activeView: 'home',
    filterGroup: 'all',
    selectedHistorySessionId: null,
    activeSession: null,
    timerState: null,
    timerInterval: null,
    routineUi: {
      collapsedByExerciseId: {},
      advancedByExerciseId: {}
    }
  };

  function todayISODate() {
    return new Date().toISOString().slice(0, 10);
  }

  function createSetFromPrevious(previous) {
    if (!previous) {
      return {
        reps: '',
        weight: '',
        tempo: '',
        rir: '',
        rpe: '',
        notes: '',
        completed: false
      };
    }

    return {
      reps: previous.reps,
      weight: previous.weight,
      tempo: previous.tempo,
      rir: previous.rir,
      rpe: previous.rpe,
      notes: previous.notes,
      completed: false
    };
  }

  function createExercise() {
    return {
      id: DB.makeId('routine_ex'),
      name: '',
      muscleGroup: 'Pecho',
      restSeconds: 90,
      sets: [createSetFromPrevious(null)]
    };
  }

  function createSessionDraft(fromSession) {
    if (fromSession) {
      return JSON.parse(JSON.stringify(fromSession));
    }

    return {
      id: '',
      name: '',
      date: todayISODate(),
      notes: '',
      exercises: [createExercise()]
    };
  }

  function getSnapshot() {
    const exerciseIds = new Set((state.activeSession?.exercises || []).map((exercise) => exercise.id));
    Object.keys(state.routineUi.collapsedByExerciseId).forEach((exerciseId) => {
      if (!exerciseIds.has(exerciseId)) {
        delete state.routineUi.collapsedByExerciseId[exerciseId];
      }
    });
    Object.keys(state.routineUi.advancedByExerciseId).forEach((exerciseId) => {
      if (!exerciseIds.has(exerciseId)) {
        delete state.routineUi.advancedByExerciseId[exerciseId];
      }
    });

    const base = DB.getState();
    return {
      sessions: DB.getSessionsSorted(),
      exercises: DB.getExercises(state.filterGroup),
      muscleGroups: DB.getMuscleGroups(),
      weightUnit: base.settings.weightUnit,
      activeSession: state.activeSession,
      activeView: state.activeView,
      filterGroup: state.filterGroup,
      selectedHistorySessionId: state.selectedHistorySessionId,
      timerState: state.timerState,
      routineUi: state.routineUi
    };
  }

  function render() {
    UI.render(getSnapshot());
  }

  function navigate(view) {
    state.activeView = view;
    render();
  }

  function createSession() {
    state.activeSession = createSessionDraft();
    state.routineUi = {
      collapsedByExerciseId: {},
      advancedByExerciseId: {}
    };
    state.activeView = 'active';
    render();
  }

  function editSession(sessionId) {
    const session = DB.getSessionById(sessionId);
    if (!session) {
      return;
    }
    state.activeSession = createSessionDraft(session);
    state.routineUi = {
      collapsedByExerciseId: {},
      advancedByExerciseId: {}
    };
    state.activeView = 'active';
    render();
  }

  function updateSessionField(field, value) {
    state.activeSession[field] = value;
  }

  function updateExerciseField(exerciseId, field, value) {
    const exercise = state.activeSession.exercises.find((item) => item.id === exerciseId);
    if (!exercise) {
      return;
    }

    if (field === 'restSeconds') {
      exercise[field] = Math.max(0, Number(value) || 0);
    } else {
      exercise[field] = value;
    }
  }

  function addExerciseToSession() {
    state.activeSession.exercises.push(createExercise());
    render();
  }

  function removeExercise(exerciseId) {
    state.activeSession.exercises = state.activeSession.exercises.filter((item) => item.id !== exerciseId);
    delete state.routineUi.collapsedByExerciseId[exerciseId];
    delete state.routineUi.advancedByExerciseId[exerciseId];
    if (!state.activeSession.exercises.length) {
      state.activeSession.exercises.push(createExercise());
    }
    render();
  }

  function addSet(exerciseId) {
    const exercise = state.activeSession.exercises.find((item) => item.id === exerciseId);
    if (!exercise) {
      return;
    }
    const previous = exercise.sets[exercise.sets.length - 1] || null;
    exercise.sets.push(createSetFromPrevious(previous));
    render();
  }

  function removeSet(exerciseId, setIndex) {
    const exercise = state.activeSession.exercises.find((item) => item.id === exerciseId);
    if (!exercise) {
      return;
    }
    exercise.sets = exercise.sets.filter((_, index) => index !== setIndex);
    const advancedState = state.routineUi.advancedByExerciseId[exerciseId] || {};
    const shiftedState = {};
    Object.keys(advancedState).forEach((key) => {
      const index = Number(key);
      if (index < setIndex) {
        shiftedState[index] = advancedState[key];
      } else if (index > setIndex) {
        shiftedState[index - 1] = advancedState[key];
      }
    });
    state.routineUi.advancedByExerciseId[exerciseId] = shiftedState;
    if (!exercise.sets.length) {
      exercise.sets.push(createSetFromPrevious(null));
    }
    render();
  }

  function toggleExerciseCollapsed(exerciseId) {
    const current = Boolean(state.routineUi.collapsedByExerciseId[exerciseId]);
    state.routineUi.collapsedByExerciseId[exerciseId] = !current;
    render();
  }

  function toggleSetAdvanced(exerciseId, setIndex) {
    if (!state.routineUi.advancedByExerciseId[exerciseId]) {
      state.routineUi.advancedByExerciseId[exerciseId] = {};
    }
    const current = Boolean(state.routineUi.advancedByExerciseId[exerciseId][setIndex]);
    state.routineUi.advancedByExerciseId[exerciseId][setIndex] = !current;
    render();
  }

  function updateSetField(exerciseId, setIndex, field, value) {
    const exercise = state.activeSession.exercises.find((item) => item.id === exerciseId);
    if (!exercise || !exercise.sets[setIndex]) {
      return;
    }
    exercise.sets[setIndex][field] = value;
  }

  function stopTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
    state.timerState = null;
    UI.renderTimer(state.timerState);
  }

  function startRestTimer(seconds) {
    const totalSeconds = Math.max(0, Number(seconds) || 0);
    if (!totalSeconds) {
      return;
    }

    stopTimer();
    state.timerState = { remaining: totalSeconds };
    UI.renderTimer(state.timerState);

    state.timerInterval = setInterval(() => {
      state.timerState.remaining -= 1;
      if (state.timerState.remaining <= 0) {
        stopTimer();
        if (navigator.vibrate) {
          navigator.vibrate([200, 120, 200]);
        }
        return;
      }
      UI.renderTimer(state.timerState);
    }, 1000);
  }

  function toggleSetCompleted(exerciseId, setIndex, checked) {
    const exercise = state.activeSession.exercises.find((item) => item.id === exerciseId);
    if (!exercise || !exercise.sets[setIndex]) {
      return;
    }

    exercise.sets[setIndex].completed = checked;
    if (checked) {
      startRestTimer(exercise.restSeconds);
    }
  }

  function saveActiveSession() {
    const session = state.activeSession;
    if (!session.name.trim()) {
      alert('Escribe un nombre de rutina.');
      return;
    }

    const savedSessionId = DB.upsertSession(session);
    stopTimer();
    state.activeView = 'home';
    state.selectedHistorySessionId = savedSessionId || null;
    state.activeSession = createSessionDraft();
    state.routineUi = {
      collapsedByExerciseId: {},
      advancedByExerciseId: {}
    };
    render();
  }

  function selectHistory(sessionId) {
    state.selectedHistorySessionId = sessionId;
    state.activeView = 'history';
    render();
  }

  function deleteSession(sessionId) {
    if (!confirm('¿Seguro que deseas eliminar esta sesión?')) {
      return;
    }

    DB.deleteSession(sessionId);
    if (state.selectedHistorySessionId === sessionId) {
      state.selectedHistorySessionId = null;
    }
    render();
  }

  function changeExerciseFilter(filter) {
    state.filterGroup = filter;
    render();
  }

  function addCustomExercise(payload) {
    if (!payload.name || !payload.name.trim()) {
      alert('El nombre del ejercicio es obligatorio.');
      return;
    }
    DB.addCustomExercise(payload);
    render();
  }

  function deleteExercise(exerciseId) {
    if (!confirm('¿Seguro que deseas borrar este ejercicio?')) {
      return;
    }
    DB.deleteExercise(exerciseId);
    render();
  }

  function updateExercise(exerciseId, payload) {
    if (!payload.name || !payload.name.trim()) {
      alert('El nombre del ejercicio es obligatorio.');
      return;
    }
    DB.updateExercise(exerciseId, payload);
    render();
  }

  function getLatestExerciseReference(exerciseName, excludedSessionId) {
    if (!exerciseName || !exerciseName.trim()) {
      return null;
    }
    return DB.findLatestExerciseStats(exerciseName, excludedSessionId);
  }

  function getPreviousBestWeight(sessionId, exerciseName) {
    const sessions = DB.getSessionsSorted();
    const currentIndex = sessions.findIndex((session) => session.id === sessionId);
    if (currentIndex < 0) {
      return null;
    }

    const lowerExerciseName = (exerciseName || '').trim().toLowerCase();
    for (let index = currentIndex + 1; index < sessions.length; index += 1) {
      const session = sessions[index];
      const match = (session.exercises || []).find(
        (exercise) => (exercise.name || '').trim().toLowerCase() === lowerExerciseName
      );
      if (match) {
        return Math.max(0, ...(match.sets || []).map((set) => Number(set.weight) || 0));
      }
    }

    return null;
  }

  function changeWeightUnit(unit) {
    DB.updateWeightUnit(unit);
    render();
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch((error) => {
          console.error('No se pudo registrar el service worker', error);
        });
      });
    }
  }

  function init() {
    state.activeSession = createSessionDraft();
    UI.init({
      navigate,
      createSession,
      editSession,
      updateSessionField,
      updateExerciseField,
      addExerciseToSession,
      removeExercise,
      addSet,
      removeSet,
      toggleExerciseCollapsed,
      toggleSetAdvanced,
      updateSetField,
      toggleSetCompleted,
      saveActiveSession,
      selectHistory,
      deleteSession,
      changeExerciseFilter,
      addCustomExercise,
      deleteExercise,
      updateExercise,
      getLatestExerciseReference,
      getPreviousBestWeight,
      changeWeightUnit
    });
    const restTimer = document.getElementById('rest-timer');
    restTimer.addEventListener('click', () => {
      stopTimer();
      if (navigator.vibrate) {
        navigator.vibrate(0);
      }
    });
    render();
    registerServiceWorker();
  }

  init();
})();
