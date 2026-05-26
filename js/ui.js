(function () {
  let handlers = null;

  function getMuscleOptions(groups, selected) {
    return groups
      .map((group) => `<option value="${group}" ${group === selected ? 'selected' : ''}>${group}</option>`)
      .join('');
  }

  function safeValue(value) {
    return String(value ?? '').replace(/[&<>"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[char]));
  }

  function formatDate(dateValue) {
    if (!dateValue) {
      return 'Sin fecha';
    }
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  function getBestWeight(exercise) {
    return Math.max(0, ...(exercise.sets || []).map((set) => Number(set.weight) || 0));
  }

  function renderDashboard(sessions) {
    const wrapper = document.getElementById('dashboard-routines');
    if (!sessions.length) {
      wrapper.innerHTML = '<p class="small">Aún no hay rutinas guardadas.</p>';
      return;
    }

    wrapper.innerHTML = sessions
      .map(
        (session) => `
          <article class="session-item">
            <h3>${safeValue(session.name || 'Rutina sin nombre')}</h3>
            <p class="meta">${formatDate(session.date)} · ${session.exercises?.length || 0} ejercicios</p>
            <div class="button-row">
              <button type="button" class="ghost" data-action="edit-session" data-session-id="${session.id}">Editar</button>
            </div>
          </article>
        `
      )
      .join('');
  }

  function renderDataList(exercises) {
    const datalist = document.getElementById('exercise-name-options');
    datalist.innerHTML = exercises.map((exercise) => `<option value="${safeValue(exercise.name)}"></option>`).join('');
  }

  function renderRoutine(activeSession, muscleGroups, weightUnit, routineUi) {
    document.getElementById('routine-name').value = activeSession.name || '';
    document.getElementById('routine-date').value = activeSession.date || '';
    document.getElementById('routine-notes').value = activeSession.notes || '';

    const container = document.getElementById('routine-exercises');
    if (!activeSession.exercises.length) {
      container.innerHTML = '<p class="small">Agrega ejercicios para comenzar.</p>';
      return;
    }

    container.innerHTML = activeSession.exercises
      .map((exercise, exerciseIndex) => {
        const reference = handlers.getLatestExerciseReference(exercise.name, activeSession.id);
        const referenceText = reference
          ? `Último registro (${formatDate(reference.date)}): ${reference.weight || 0} ${weightUnit} × ${reference.reps || 0} reps`
          : 'Sin registro anterior';
        const completedSets = (exercise.sets || []).filter((set) => set.completed).length;
        const isCollapsed = Boolean(routineUi.collapsedByExerciseId[exercise.id]);
        const exerciseName = (exercise.name || '').trim() || `Ejercicio ${exerciseIndex + 1}`;

        return `
          <article class="exercise-card ${isCollapsed ? 'is-collapsed' : ''}" data-exercise-id="${exercise.id}">
            <div class="exercise-card-header">
              <div class="exercise-card-heading">
                <h3 class="exercise-card-name">${safeValue(exerciseName)}</h3>
                <div class="exercise-card-meta">
                  <span class="exercise-card-group">${safeValue(exercise.muscleGroup || 'Sin grupo')}</span>
                  <span class="series-badge">${completedSets} series</span>
                </div>
              </div>
              <div class="exercise-card-actions">
                <button type="button" class="danger icon-btn" data-action="remove-exercise" data-exercise-id="${exercise.id}" aria-label="Eliminar ejercicio">×</button>
                <button type="button" class="secondary icon-btn chevron-btn" data-action="toggle-exercise-collapse" data-exercise-id="${exercise.id}" aria-expanded="${(!isCollapsed).toString()}" aria-label="${isCollapsed ? 'Expandir ejercicio' : 'Colapsar ejercicio'}">${isCollapsed ? '▼' : '▲'}</button>
              </div>
            </div>

            <div class="exercise-card-details">
              <div class="info-pill">${safeValue(referenceText)}</div>

              <label>Nombre del ejercicio</label>
              <input
                type="text"
                list="exercise-name-options"
                value="${safeValue(exercise.name)}"
                data-action="exercise-field"
                data-field="name"
                data-exercise-id="${exercise.id}"
                required
              >

              <label>Grupo muscular</label>
              <select data-action="exercise-field" data-field="muscleGroup" data-exercise-id="${exercise.id}">
                ${getMuscleOptions(muscleGroups, exercise.muscleGroup)}
              </select>

              <label>Descanso sugerido (segundos)</label>
              <input
                type="number"
                min="0"
                value="${safeValue(exercise.restSeconds || 0)}"
                data-action="exercise-field"
                data-field="restSeconds"
                data-exercise-id="${exercise.id}"
              >

              <div class="stack">
                ${(exercise.sets || [])
                  .map((set, setIndex) => {
                    const isAdvancedVisible = Boolean((routineUi.advancedByExerciseId[exercise.id] || {})[setIndex]);
                    return `
                      <article class="set-row">
                        <div class="set-title">
                          <span>#${setIndex + 1}</span>
                          <div class="set-actions">
                            <button type="button" class="ghost set-toggle-advanced" data-action="toggle-set-advanced" data-exercise-id="${exercise.id}" data-set-index="${setIndex}">${isAdvancedVisible ? '− campos' : '+ campos'}</button>
                            <button type="button" class="danger icon-btn" data-action="remove-set" data-exercise-id="${exercise.id}" data-set-index="${setIndex}" aria-label="Eliminar serie">×</button>
                          </div>
                        </div>

                        <div class="set-grid-basic">
                          <div>
                            <label>Reps</label>
                            <input type="number" min="0" value="${safeValue(set.reps)}" data-action="set-field" data-field="reps" data-exercise-id="${exercise.id}" data-set-index="${setIndex}">
                          </div>
                          <div>
                            <label>Peso (${weightUnit})</label>
                            <input type="number" min="0" step="0.5" value="${safeValue(set.weight)}" data-action="set-field" data-field="weight" data-exercise-id="${exercise.id}" data-set-index="${setIndex}">
                          </div>
                          <label class="checkbox-wrap checkbox-cell">
                            <input type="checkbox" ${set.completed ? 'checked' : ''} data-action="set-completed" data-exercise-id="${exercise.id}" data-set-index="${setIndex}" aria-label="Serie completada">
                            <span>✓</span>
                          </label>
                        </div>

                        <div class="set-advanced-fields ${isAdvancedVisible ? 'is-visible' : ''}">
                          <div class="set-grid-advanced">
                            <div>
                              <label title="Excéntrico-Pausa abajo-Concéntrico-Pausa arriba">Tempo</label>
                              <input type="text" placeholder="3-1-2-0" value="${safeValue(set.tempo)}" data-action="set-field" data-field="tempo" data-exercise-id="${exercise.id}" data-set-index="${setIndex}">
                            </div>
                            <div>
                              <label>RIR (0-5)</label>
                              <input type="number" min="0" max="5" value="${safeValue(set.rir)}" data-action="set-field" data-field="rir" data-exercise-id="${exercise.id}" data-set-index="${setIndex}">
                            </div>
                            <div>
                              <label>RPE (1-10)</label>
                              <input type="number" min="1" max="10" value="${safeValue(set.rpe)}" data-action="set-field" data-field="rpe" data-exercise-id="${exercise.id}" data-set-index="${setIndex}">
                            </div>
                            <div class="set-notes-field">
                              <label>Notas por serie</label>
                              <input type="text" value="${safeValue(set.notes)}" data-action="set-field" data-field="notes" data-exercise-id="${exercise.id}" data-set-index="${setIndex}">
                            </div>
                          </div>
                        </div>
                      </article>
                    `;
                  })
                  .join('')}
              </div>

              <button type="button" class="secondary add-set-btn" data-action="add-set" data-exercise-id="${exercise.id}">＋ Serie</button>
            </div>
          </article>
        `;
      })
      .join('');
  }

  function trendArrow(current, previous) {
    if (previous == null) {
      return '•';
    }
    if (current > previous) {
      return '↑';
    }
    if (current < previous) {
      return '↓';
    }
    return '→';
  }

  function renderHistory(sessions, selectedSessionId, unit) {
    const list = document.getElementById('history-list');
    if (!sessions.length) {
      list.innerHTML = '<p class="small">Todavía no hay sesiones registradas.</p>';
      document.getElementById('history-detail').innerHTML = 'Selecciona una sesión para ver detalles.';
      return;
    }

    list.innerHTML = sessions
      .map(
        (session) => `
          <article class="session-item">
            <h3>${safeValue(session.name || 'Rutina sin nombre')}</h3>
            <p class="meta">${formatDate(session.date)}</p>
            <div class="button-row">
              <button type="button" class="ghost" data-action="select-history" data-session-id="${session.id}">Ver detalle</button>
              <button type="button" class="danger" data-action="delete-session" data-session-id="${session.id}">Eliminar</button>
            </div>
          </article>
        `
      )
      .join('');

    const selected = sessions.find((session) => session.id === selectedSessionId) || sessions[0];
    if (!selected) {
      return;
    }

    const detail = document.getElementById('history-detail');
    detail.innerHTML = `
      <h3>${safeValue(selected.name || 'Rutina sin nombre')}</h3>
      <p class="meta">${formatDate(selected.date)}</p>
      <p>${safeValue(selected.notes || 'Sin notas generales.')}</p>
      <div class="stack">
        ${(selected.exercises || [])
          .map((exercise) => {
            const currentBest = getBestWeight(exercise);
            const prevBest = handlers.getPreviousBestWeight(selected.id, exercise.name);
            return `
              <article class="exercise-item">
                <h4>${safeValue(exercise.name)} ${trendArrow(currentBest, prevBest)}</h4>
                <p class="meta">Mejor peso: ${currentBest} ${unit}${prevBest != null ? ` (previo ${prevBest} ${unit})` : ''}</p>
                <p class="small">Series: ${(exercise.sets || []).length}</p>
              </article>
            `;
          })
          .join('')}
      </div>
    `;
  }

  function renderExerciseLibrary(exercises, muscleGroups, selectedFilter) {
    const filter = document.getElementById('exercise-filter');
    const options = ['all', ...muscleGroups];
    filter.innerHTML = options
      .map((value) => `<option value="${value}" ${value === selectedFilter ? 'selected' : ''}>${value === 'all' ? 'Todos' : value}</option>`)
      .join('');

    const customGroup = document.getElementById('custom-exercise-group');
    customGroup.innerHTML = muscleGroups.map((group) => `<option value="${group}">${group}</option>`).join('');

    const list = document.getElementById('exercise-library-list');
    if (!exercises.length) {
      list.innerHTML = '<p class="small">No hay ejercicios para este filtro.</p>';
      return;
    }

    list.innerHTML = exercises
      .map(
        (exercise) => `
          <article class="exercise-item">
            <h3>${safeValue(exercise.name)}</h3>
            <p class="meta">${safeValue(exercise.muscleGroup)}${exercise.notes ? ` · ${safeValue(exercise.notes)}` : ''}</p>
            <div class="button-row">
              <button type="button" class="secondary" data-action="toggle-edit-exercise" data-exercise-id="${exercise.id}">✏️ Editar</button>
              <button type="button" class="danger" data-action="delete-exercise" data-exercise-id="${exercise.id}">🗑️ Borrar</button>
            </div>
            <form class="exercise-edit-form hidden" data-action="exercise-edit-form" data-exercise-id="${exercise.id}">
              <label>Nombre</label>
              <input type="text" name="name" value="${safeValue(exercise.name)}" required>

              <label>Grupo muscular</label>
              <select name="muscleGroup">
                ${getMuscleOptions(muscleGroups, exercise.muscleGroup)}
              </select>

              <label>Notas</label>
              <textarea name="notes" rows="2" placeholder="Opcional">${safeValue(exercise.notes || '')}</textarea>

              <div class="button-row">
                <button type="submit">Guardar cambios</button>
                <button type="button" class="secondary" data-action="cancel-edit-exercise">Cancelar</button>
              </div>
            </form>
          </article>
        `
      )
      .join('');
  }

  function renderTimer(timerState) {
    const timer = document.getElementById('rest-timer');
    if (!timerState || timerState.remaining <= 0) {
      timer.classList.add('hidden');
      timer.textContent = '';
      return;
    }

    timer.classList.remove('hidden');
    timer.innerHTML = `
      <div class="timer-value">Descanso ${timerState.remaining}s</div>
      <div class="timer-hint">toca para cancelar</div>
    `;
  }

  function toggleView(activeView) {
    document.querySelectorAll('.view').forEach((view) => {
      view.classList.toggle('active', view.id === `view-${activeView}`);
    });

    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.view === activeView);
    });
  }

  function bindEvents() {
    document.querySelector('.bottom-nav').addEventListener('click', (event) => {
      const button = event.target.closest('.nav-item');
      if (button) {
        handlers.navigate(button.dataset.view);
      }
    });

    document.getElementById('new-session-fab').addEventListener('click', () => handlers.createSession());

    document.getElementById('weight-unit').addEventListener('change', (event) => {
      handlers.changeWeightUnit(event.target.value);
    });

    document.getElementById('routine-form').addEventListener('submit', (event) => {
      event.preventDefault();
      handlers.saveActiveSession();
    });

    document.getElementById('routine-name').addEventListener('input', (event) => {
      handlers.updateSessionField('name', event.target.value);
    });

    document.getElementById('routine-date').addEventListener('change', (event) => {
      handlers.updateSessionField('date', event.target.value);
    });

    document.getElementById('routine-notes').addEventListener('input', (event) => {
      handlers.updateSessionField('notes', event.target.value);
    });

    document.getElementById('add-exercise-btn').addEventListener('click', () => {
      handlers.addExerciseToSession();
    });

    document.getElementById('routine-exercises').addEventListener('input', (event) => {
      const target = event.target;
      const action = target.dataset.action;
      if (action === 'exercise-field') {
        handlers.updateExerciseField(target.dataset.exerciseId, target.dataset.field, target.value);
      }
      if (action === 'set-field') {
        handlers.updateSetField(
          target.dataset.exerciseId,
          Number(target.dataset.setIndex),
          target.dataset.field,
          target.value
        );
      }
    });

    document.getElementById('routine-exercises').addEventListener('change', (event) => {
      const target = event.target;
      if (target.dataset.action === 'set-completed') {
        handlers.toggleSetCompleted(
          target.dataset.exerciseId,
          Number(target.dataset.setIndex),
          target.checked
        );
      }
    });

    document.getElementById('routine-exercises').addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) {
        return;
      }

      const action = button.dataset.action;
      if (action === 'remove-exercise') {
        handlers.removeExercise(button.dataset.exerciseId);
      }
      if (action === 'toggle-exercise-collapse') {
        handlers.toggleExerciseCollapsed(button.dataset.exerciseId);
      }
      if (action === 'add-set') {
        handlers.addSet(button.dataset.exerciseId);
      }
      if (action === 'remove-set') {
        handlers.removeSet(button.dataset.exerciseId, Number(button.dataset.setIndex));
      }
      if (action === 'toggle-set-advanced') {
        handlers.toggleSetAdvanced(button.dataset.exerciseId, Number(button.dataset.setIndex));
      }
    });

    document.getElementById('dashboard-routines').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action="edit-session"]');
      if (button) {
        handlers.editSession(button.dataset.sessionId);
      }
    });

    document.getElementById('history-list').addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) {
        return;
      }

      if (button.dataset.action === 'select-history') {
        handlers.selectHistory(button.dataset.sessionId);
      }
      if (button.dataset.action === 'delete-session') {
        handlers.deleteSession(button.dataset.sessionId);
      }
    });

    document.getElementById('exercise-filter').addEventListener('change', (event) => {
      handlers.changeExerciseFilter(event.target.value);
    });

    document.getElementById('exercise-library-list').addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) {
        return;
      }

      if (button.dataset.action === 'delete-exercise') {
        handlers.deleteExercise(button.dataset.exerciseId);
      }

      if (button.dataset.action === 'toggle-edit-exercise') {
        const article = button.closest('.exercise-item');
        const form = article?.querySelector('.exercise-edit-form');
        if (form) {
          form.classList.toggle('hidden');
        }
      }

      if (button.dataset.action === 'cancel-edit-exercise') {
        const form = button.closest('.exercise-edit-form');
        if (form) {
          form.classList.add('hidden');
        }
      }
    });

    document.getElementById('exercise-library-list').addEventListener('submit', (event) => {
      const form = event.target.closest('form[data-action="exercise-edit-form"]');
      if (!form) {
        return;
      }

      event.preventDefault();
      handlers.updateExercise(form.dataset.exerciseId, {
        name: form.querySelector('[name="name"]').value,
        muscleGroup: form.querySelector('[name="muscleGroup"]').value,
        notes: form.querySelector('[name="notes"]').value
      });
    });

    document.getElementById('custom-exercise-form').addEventListener('submit', (event) => {
      event.preventDefault();
      handlers.addCustomExercise({
        name: document.getElementById('custom-exercise-name').value,
        muscleGroup: document.getElementById('custom-exercise-group').value,
        notes: document.getElementById('custom-exercise-notes').value
      });
      event.target.reset();
    });
  }

  function init(inputHandlers) {
    handlers = inputHandlers;
    bindEvents();
  }

  function render(state) {
    const { sessions, exercises, activeSession, activeView, muscleGroups, filterGroup, weightUnit, timerState, routineUi } = state;

    toggleView(activeView);
    document.getElementById('weight-unit').value = weightUnit;

    renderDashboard(sessions);
    renderRoutine(activeSession, muscleGroups, weightUnit, routineUi);
    renderHistory(sessions, state.selectedHistorySessionId, weightUnit);
    renderExerciseLibrary(exercises, muscleGroups, filterGroup);
    renderDataList(exercises);
    renderTimer(timerState);
  }

  window.UI = {
    init,
    render,
    renderTimer
  };
})();
