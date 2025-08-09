// ===== ENHANCED TASK MANAGER CLASS =====
class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.selectedTasks = new Set();
        this.currentEditingTask = null;
        this.nextId = 1;
        this.categories = {
            'personal': '👤 Personal',
            'work': '💼 Work',
            'health': '🏥 Health',
            'finance': '💰 Finance',
            'education': '📚 Education',
            'shopping': '🛒 Shopping',
            'travel': '✈️ Travel',
            'home': '🏠 Home',
            'other': '📋 Other'
        };

        // Initialize the application
        this.init();
    }

    init() {
        this.loadTasks();
        this.bindEvents();
        this.updateUI();
        this.showWelcomeMessage();
    }

    // ===== DATA PERSISTENCE =====
    loadTasks() {
        try {
            const savedTasks = localStorage.getItem('taskmaster_tasks');
            if (savedTasks) {
                this.tasks = JSON.parse(savedTasks);
                // Migrate old tasks to new format
                this.tasks = this.tasks.map(task => this.migrateTask(task));
                this.nextId = Math.max(...this.tasks.map(t => t.id), 0) + 1;
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.showToast('Error loading saved tasks', 'error');
        }
    }

    migrateTask(task) {
        // Ensure all new properties exist
        return {
            id: task.id,
            title: task.text || task.title || 'Untitled Task',
            description: task.description || '',
            priority: task.priority || 'medium',
            category: task.category || 'personal',
            completed: task.completed || false,
            createdAt: task.createdAt || new Date().toISOString(),
            completedAt: task.completedAt || null,
            dueDate: task.dueDate || null,
            estimatedTime: task.estimatedTime || null,
            tags: task.tags || [],
            subtasks: task.subtasks || [],
            location: task.location || '',
            url: task.url || '',
            recurring: task.recurring || false,
            recurrencePattern: task.recurrencePattern || 'daily',
            timeSpent: task.timeSpent || 0
        };
    }

    saveTasks() {
        try {
            localStorage.setItem('taskmaster_tasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('Error saving tasks:', error);
            this.showToast('Error saving tasks', 'error');
        }
    }

    // ===== ENHANCED TASK OPERATIONS =====
    addTask(taskData, isDetailed = false) {
        if (!taskData.title || !taskData.title.trim()) {
            this.showToast('Please enter a task title', 'warning');
            return false;
        }

        const task = {
            id: this.nextId++,
            title: taskData.title.trim(),
            description: taskData.description || '',
            priority: taskData.priority || 'medium',
            category: taskData.category || 'personal',
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null,
            dueDate: taskData.dueDate || null,
            estimatedTime: taskData.estimatedTime || null,
            tags: this.parseTags(taskData.tags || ''),
            subtasks: taskData.subtasks || [],
            location: taskData.location || '',
            url: taskData.url || '',
            recurring: taskData.recurring || false,
            recurrencePattern: taskData.recurrencePattern || 'daily',
            timeSpent: 0
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.updateUI();
        this.showToast('Task added successfully', 'success');

        // Clear inputs
        if (!isDetailed) {
            document.getElementById('taskInput').value = '';
        }

        return true;
    }

    parseTags(tagsString) {
        if (!tagsString) return [];
        return tagsString.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
            .map(tag => tag.toLowerCase());
    }

    updateTask(id, updates) {
        const taskIndex = this.tasks.findIndex(t => t.id === id);
        if (taskIndex === -1) {
            this.showToast('Task not found', 'error');
            return false;
        }

        // Handle tags update
        if (updates.tags && typeof updates.tags === 'string') {
            updates.tags = this.parseTags(updates.tags);
        }

        this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates };
        this.saveTasks();
        this.updateUI();
        this.showToast('Task updated successfully', 'success');
        return true;
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return false;

        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;

        // Handle recurring tasks
        if (task.completed && task.recurring) {
            this.createRecurringTask(task);
        }

        this.saveTasks();
        this.updateUI();
        this.showToast(
            task.completed ? 'Task completed! 🎉' : 'Task marked as pending',
            task.completed ? 'success' : 'warning'
        );
        return true;
    }

    createRecurringTask(originalTask) {
        const newTask = { ...originalTask };
        newTask.id = this.nextId++;
        newTask.completed = false;
        newTask.completedAt = null;
        newTask.createdAt = new Date().toISOString();

        // Calculate next due date
        if (newTask.dueDate) {
            const currentDue = new Date(newTask.dueDate);
            const nextDue = new Date(currentDue);

            switch (newTask.recurrencePattern) {
                case 'daily':
                    nextDue.setDate(nextDue.getDate() + 1);
                    break;
                case 'weekly':
                    nextDue.setDate(nextDue.getDate() + 7);
                    break;
                case 'monthly':
                    nextDue.setMonth(nextDue.getMonth() + 1);
                    break;
                case 'yearly':
                    nextDue.setFullYear(nextDue.getFullYear() + 1);
                    break;
            }

            newTask.dueDate = nextDue.toISOString();
        }

        // Reset subtasks
        newTask.subtasks = newTask.subtasks.map(st => ({ ...st, completed: false }));
        newTask.timeSpent = 0;

        this.tasks.unshift(newTask);
        this.showToast(`Recurring task created for ${this.formatDate(newTask.dueDate)}`, 'info');
    }

    toggleSubtask(taskId, subtaskIndex) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.subtasks[subtaskIndex]) return false;

        task.subtasks[subtaskIndex].completed = !task.subtasks[subtaskIndex].completed;
        this.saveTasks();
        this.updateUI();
        return true;
    }

    deleteTask(id) {
        const taskIndex = this.tasks.findIndex(t => t.id === id);
        if (taskIndex === -1) return false;

        this.tasks.splice(taskIndex, 1);
        this.selectedTasks.delete(id);
        this.saveTasks();
        this.updateUI();
        this.showToast('Task deleted successfully', 'success');
        return true;
    }

    deleteSelectedTasks() {
        if (this.selectedTasks.size === 0) {
            this.showToast('No tasks selected', 'warning');
            return;
        }

        const count = this.selectedTasks.size;
        this.tasks = this.tasks.filter(task => !this.selectedTasks.has(task.id));
        this.selectedTasks.clear();

        this.saveTasks();
        this.updateUI();
        this.showToast(`${count} task(s) deleted successfully`, 'success');
    }

    clearCompletedTasks() {
        const completedCount = this.tasks.filter(t => t.completed).length;
        if (completedCount === 0) {
            this.showToast('No completed tasks to clear', 'warning');
            return;
        }

        this.tasks = this.tasks.filter(task => !task.completed);
        this.selectedTasks.clear();

        this.saveTasks();
        this.updateUI();
        this.showToast(`${completedCount} completed task(s) cleared`, 'success');
    }

    // ===== ENHANCED FILTERING AND SEARCHING =====
    getFilteredTasks() {
        let filtered = [...this.tasks];

        // Apply search filter
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(task =>
                task.title.toLowerCase().includes(query) ||
                task.description.toLowerCase().includes(query) ||
                task.tags.some(tag => tag.includes(query)) ||
                task.category.toLowerCase().includes(query)
            );
        }

        // Apply category filter
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (this.currentFilter) {
            case 'pending':
                filtered = filtered.filter(task => !task.completed);
                break;
            case 'completed':
                filtered = filtered.filter(task => task.completed);
                break;
            case 'high':
                filtered = filtered.filter(task => task.priority === 'high');
                break;
            case 'urgent':
                filtered = filtered.filter(task => task.priority === 'urgent');
                break;
            case 'overdue':
                filtered = filtered.filter(task => {
                    if (!task.dueDate || task.completed) return false;
                    return new Date(task.dueDate) < now;
                });
                break;
            case 'today':
                filtered = filtered.filter(task => {
                    if (!task.dueDate || task.completed) return false;
                    const dueDate = new Date(task.dueDate);
                    return dueDate >= today && dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
                });
                break;
        }

        // Sort tasks: incomplete first, then by priority, then by due date, then by creation date
        filtered.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed - b.completed;
            }

            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }

            // Sort by due date if both have due dates
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }

            // Tasks with due dates come first
            if (a.dueDate && !b.dueDate) return -1;
            if (!a.dueDate && b.dueDate) return 1;

            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        return filtered;
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.selectedTasks.clear();
        this.updateUI();
    }

    setSearchQuery(query) {
        this.searchQuery = query;
        this.selectedTasks.clear();
        this.updateUI();
    }

    // ===== SELECTION MANAGEMENT =====
    toggleTaskSelection(id) {
        if (this.selectedTasks.has(id)) {
            this.selectedTasks.delete(id);
        } else {
            this.selectedTasks.add(id);
        }
        this.updateUI();
    }

    selectAllVisibleTasks() {
        const visibleTasks = this.getFilteredTasks();
        const allSelected = visibleTasks.every(task => this.selectedTasks.has(task.id));

        if (allSelected) {
            // Deselect all visible tasks
            visibleTasks.forEach(task => this.selectedTasks.delete(task.id));
        } else {
            // Select all visible tasks
            visibleTasks.forEach(task => this.selectedTasks.add(task.id));
        }

        this.updateUI();
    }

    // ===== UI UPDATES =====
    updateUI() {
        this.renderTasks();
        this.updateStats();
        this.updateFilterButtons();
        this.updateBulkActions();
    }

    renderTasks() {
        const container = document.getElementById('tasksContainer');
        const emptyState = document.getElementById('emptyState');
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';

            if (this.searchQuery) {
                emptyState.innerHTML = `
                    <div class="empty-illustration">
                        <i class="fas fa-search"></i>
                    </div>
                    <h3>No tasks found</h3>
                    <p>No tasks match your search for "${this.searchQuery}"</p>
                `;
            } else if (this.currentFilter !== 'all') {
                emptyState.innerHTML = `
                    <div class="empty-illustration">
                        <i class="fas fa-filter"></i>
                    </div>
                    <h3>No tasks in this filter</h3>
                    <p>Try switching to a different filter or add some tasks</p>
                `;
            } else {
                emptyState.innerHTML = `
                    <div class="empty-illustration">
                        <i class="fas fa-clipboard-list"></i>
                    </div>
                    <h3>No tasks yet</h3>
                    <p>Add your first task to get started on your productivity journey!</p>
                `;
            }
            return;
        }

        container.style.display = 'flex';
        emptyState.style.display = 'none';

        container.innerHTML = filteredTasks.map(task => this.createTaskHTML(task)).join('');
    }

    createTaskHTML(task) {
        const isSelected = this.selectedTasks.has(task.id);
        const timeAgo = this.getTimeAgo(task.createdAt);
        const now = new Date();
        const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < now;
        const isDueToday = task.dueDate && !task.completed && this.isDueToday(task.dueDate);
        const completedSubtasks = task.subtasks.filter(st => st.completed).length;
        const totalSubtasks = task.subtasks.length;
        const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

        let extraClasses = '';
        if (isOverdue) extraClasses += ' overdue';
        if (isDueToday) extraClasses += ' due-today';

        return `
            <div class="task-item ${task.completed ? 'completed' : ''} ${isSelected ? 'selected' : ''} priority-${task.priority}${extraClasses}" 
                 data-task-id="${task.id}">
                <div class="task-content">
                    <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                         onclick="taskManager.toggleTask(${task.id})">
                        <i class="fas fa-check"></i>
                    </div>
                    <div class="task-details">
                        <div class="task-text">${this.escapeHtml(task.title)}</div>
                        ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                        
                        <div class="task-meta">
                            <span class="priority-badge ${task.priority}">${this.getPriorityEmoji(task.priority)} ${task.priority}</span>
                            <span class="category-badge">${this.categories[task.category]}</span>
                            <span class="task-time">Created ${timeAgo}</span>
                            ${task.completed ? `<span class="task-completed">✓ Completed</span>` : ''}
                        </div>
                        
                        ${this.renderTaskExtendedDetails(task)}
                        
                        ${task.tags.length > 0 ? `
                            <div class="task-tags">
                                ${task.tags.map(tag => `<span class="task-tag">#${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                        
                        ${totalSubtasks > 0 ? `
                            <div class="task-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${progress}%"></div>
                                </div>
                                <div class="subtasks-summary">${completedSubtasks}/${totalSubtasks} subtasks completed</div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="task-actions">
                        <button class="action-btn select" 
                                onclick="taskManager.toggleTaskSelection(${task.id})"
                                title="${isSelected ? 'Deselect' : 'Select'} task">
                            <i class="fas ${isSelected ? 'fa-check-square' : 'fa-square'}"></i>
                        </button>
                        <button class="action-btn edit" 
                                onclick="taskManager.openEditModal(${task.id})"
                                title="Edit task">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" 
                                onclick="taskManager.deleteTask(${task.id})"
                                title="Delete task">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderTaskExtendedDetails(task) {
        const details = [];

        if (task.dueDate) {
            const dueText = this.formatDueDate(task.dueDate);
            details.push(`<span class="task-info-item"><i class="fas fa-calendar"></i> ${dueText}</span>`);
        }

        if (task.estimatedTime) {
            details.push(`<span class="task-info-item"><i class="fas fa-clock"></i> ${this.formatTime(task.estimatedTime)}</span>`);
        }

        if (task.location) {
            details.push(`<span class="task-info-item"><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(task.location)}</span>`);
        }

        if (task.url) {
            details.push(`<span class="task-info-item"><a href="${task.url}" target="_blank" class="task-url"><i class="fas fa-link"></i> Link</a></span>`);
        }

        if (task.recurring) {
            details.push(`<span class="task-info-item"><i class="fas fa-redo"></i> Repeats ${task.recurrencePattern}</span>`);
        }

        if (details.length > 0) {
            return `
                <div class="task-details-extended">
                    <div class="task-info-row">
                        ${details.join('')}
                    </div>
                </div>
            `;
        }

        return '';
    }

    getPriorityEmoji(priority) {
        const emojis = {
            low: '🟢',
            medium: '🟡',
            high: '🔴',
            urgent: '⚡'
        };
        return emojis[priority] || '🟡';
    }

    formatDueDate(dueDate) {
        const due = new Date(dueDate);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

        if (due < now) {
            return `<span style="color: var(--danger-color)">Overdue (${due.toLocaleDateString()})</span>`;
        } else if (due >= today && due < tomorrow) {
            return `<span style="color: var(--warning-color)">Due Today</span>`;
        } else if (due >= tomorrow && due < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) {
            return `<span style="color: var(--info-color)">Due Tomorrow</span>`;
        } else {
            return `Due ${due.toLocaleDateString()}`;
        }
    }

    formatTime(minutes) {
        if (minutes < 60) {
            return `${minutes}m`;
        } else {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
    }

    isDueToday(dueDate) {
        const due = new Date(dueDate);
        const today = new Date();
        return due.getDate() === today.getDate() &&
            due.getMonth() === today.getMonth() &&
            due.getFullYear() === today.getFullYear();
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;

        document.getElementById('totalTasks').textContent = total;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('pendingTasks').textContent = pending;
    }

    updateFilterButtons() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
        });
    }

    updateBulkActions() {
        const selectAllBtn = document.getElementById('selectAllBtn');
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        const visibleTasks = this.getFilteredTasks();
        const allSelected = visibleTasks.length > 0 &&
            visibleTasks.every(task => this.selectedTasks.has(task.id));

        selectAllBtn.innerHTML = `
            <i class="fas ${allSelected ? 'fa-minus-square' : 'fa-check-square'}"></i>
            ${allSelected ? 'Deselect All' : 'Select All'}
        `;

        deleteSelectedBtn.disabled = this.selectedTasks.size === 0;
        deleteSelectedBtn.style.opacity = this.selectedTasks.size === 0 ? '0.5' : '1';
    }

    // ===== ENHANCED MODAL MANAGEMENT =====
    openEditModal(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.currentEditingTask = taskId;

        // Populate form fields
        document.getElementById('editTaskInput').value = task.title;
        document.getElementById('editTaskDescription').value = task.description || '';
        document.getElementById('editPrioritySelect').value = task.priority;
        document.getElementById('editCategorySelect').value = task.category;
        document.getElementById('editDueDate').value = task.dueDate ? this.formatDateTimeLocal(task.dueDate) : '';
        document.getElementById('editEstimatedTime').value = task.estimatedTime || '';
        document.getElementById('editTags').value = task.tags.join(', ');
        document.getElementById('editLocation').value = task.location || '';
        document.getElementById('editUrl').value = task.url || '';
        document.getElementById('editRecurring').checked = task.recurring || false;
        document.getElementById('editRecurrencePattern').value = task.recurrencePattern || 'daily';

        // Handle custom time
        this.toggleCustomTimeInput();
        this.toggleRecurringOptions();

        // Populate subtasks
        this.renderSubtasks(task.subtasks);

        document.getElementById('modalTitle').textContent = 'Edit Task';
        document.getElementById('taskModal').classList.add('active');
    }

    openNewTaskModal() {
        this.currentEditingTask = null;

        // Clear form fields
        document.getElementById('editTaskInput').value = '';
        document.getElementById('editTaskDescription').value = '';
        document.getElementById('editPrioritySelect').value = 'medium';
        document.getElementById('editCategorySelect').value = 'personal';
        document.getElementById('editDueDate').value = '';
        document.getElementById('editEstimatedTime').value = '';
        document.getElementById('editTags').value = '';
        document.getElementById('editLocation').value = '';
        document.getElementById('editUrl').value = '';
        document.getElementById('editRecurring').checked = false;
        document.getElementById('editRecurrencePattern').value = 'daily';

        // Clear subtasks
        this.renderSubtasks([]);

        document.getElementById('modalTitle').textContent = 'Add New Task';
        document.getElementById('taskModal').classList.add('active');
    }

    renderSubtasks(subtasks) {
        const container = document.getElementById('subtasksList');
        container.innerHTML = '';

        subtasks.forEach((subtask, index) => {
            const subtaskElement = document.createElement('div');
            subtaskElement.className = 'subtask-item';
            subtaskElement.innerHTML = `
                <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                       onchange="taskManager.updateSubtaskFromModal(${index}, this.checked)">
                <input type="text" class="subtask-input" value="${this.escapeHtml(subtask.title)}"
                       onchange="taskManager.updateSubtaskTitleFromModal(${index}, this.value)">
                <button type="button" class="btn danger small" onclick="taskManager.removeSubtaskFromModal(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            container.appendChild(subtaskElement);
        });
    }

    addSubtaskToModal() {
        const container = document.getElementById('subtasksList');
        const index = container.children.length;

        const subtaskElement = document.createElement('div');
        subtaskElement.className = 'subtask-item';
        subtaskElement.innerHTML = `
            <input type="checkbox">
            <input type="text" class="subtask-input" placeholder="Enter subtask..."
                   onchange="taskManager.updateSubtaskTitleFromModal(${index}, this.value)">
            <button type="button" class="btn danger small" onclick="taskManager.removeSubtaskFromModal(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(subtaskElement);

        // Focus the new input
        const input = subtaskElement.querySelector('.subtask-input');
        input.focus();
    }

    updateSubtaskFromModal(index, completed) {
        // This will be handled when saving the task
    }

    updateSubtaskTitleFromModal(index, title) {
        // This will be handled when saving the task
    }

    removeSubtaskFromModal(index) {
        const container = document.getElementById('subtasksList');
        if (container.children[index]) {
            container.children[index].remove();
            // Re-render with updated indices
            const subtasks = this.getSubtasksFromModal();
            this.renderSubtasks(subtasks);
        }
    }

    getSubtasksFromModal() {
        const container = document.getElementById('subtasksList');
        const subtasks = [];

        Array.from(container.children).forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const input = item.querySelector('.subtask-input');

            if (input.value.trim()) {
                subtasks.push({
                    title: input.value.trim(),
                    completed: checkbox.checked
                });
            }
        });

        return subtasks;
    }

    toggleCustomTimeInput() {
        const select = document.getElementById('editEstimatedTime');
        const customGroup = document.getElementById('customTimeGroup');

        if (select.value === 'custom') {
            customGroup.style.display = 'block';
        } else {
            customGroup.style.display = 'none';
        }
    }

    toggleRecurringOptions() {
        const checkbox = document.getElementById('editRecurring');
        const options = document.getElementById('recurringOptions');

        if (checkbox.checked) {
            options.style.display = 'block';
        } else {
            options.style.display = 'none';
        }
    }

    formatDateTimeLocal(isoString) {
        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    closeEditModal() {
        this.currentEditingTask = null;
        document.getElementById('taskModal').classList.remove('active');
    }

    saveEditedTask() {
        const title = document.getElementById('editTaskInput').value.trim();
        const description = document.getElementById('editTaskDescription').value.trim();
        const priority = document.getElementById('editPrioritySelect').value;
        const category = document.getElementById('editCategorySelect').value;
        const dueDate = document.getElementById('editDueDate').value;
        const estimatedTimeSelect = document.getElementById('editEstimatedTime').value;
        const customTime = document.getElementById('editCustomTime').value;
        const tags = document.getElementById('editTags').value;
        const location = document.getElementById('editLocation').value.trim();
        const url = document.getElementById('editUrl').value.trim();
        const recurring = document.getElementById('editRecurring').checked;
        const recurrencePattern = document.getElementById('editRecurrencePattern').value;

        if (!title) {
            this.showToast('Please enter a task title', 'warning');
            return;
        }

        // Calculate estimated time
        let estimatedTime = null;
        if (estimatedTimeSelect === 'custom' && customTime) {
            estimatedTime = parseInt(customTime);
        } else if (estimatedTimeSelect && estimatedTimeSelect !== 'custom') {
            estimatedTime = parseInt(estimatedTimeSelect);
        }

        const taskData = {
            title,
            description,
            priority,
            category,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
            estimatedTime,
            tags,
            location,
            url,
            recurring,
            recurrencePattern,
            subtasks: this.getSubtasksFromModal()
        };

        if (this.currentEditingTask) {
            this.updateTask(this.currentEditingTask, taskData);
        } else {
            this.addTask(taskData, true);
        }

        this.closeEditModal();
    }

    // ===== THEME MANAGEMENT =====
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('taskmaster_theme', newTheme);

        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

        this.showToast(`Switched to ${newTheme} theme`, 'success');
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('taskmaster_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);

        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // ===== TOAST NOTIFICATIONS =====
    showToast(message, type = 'success', duration = 3000) {
        const container = document.getElementById('toastContainer');
        const toastId = Date.now();

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.id = `toast-${toastId}`;
        toast.innerHTML = `
            <i class="fas ${icons[type]} toast-icon"></i>
            <span class="toast-message">${this.escapeHtml(message)}</span>
            <button class="toast-close" onclick="taskManager.closeToast('${toastId}')">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto-remove
        setTimeout(() => this.closeToast(toastId), duration);
    }

    closeToast(toastId) {
        const toast = document.getElementById(`toast-${toastId}`);
        if (toast) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }

    // ===== ENHANCED EVENT BINDING =====
    bindEvents() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Task input - Quick add
        const taskInput = document.getElementById('taskInput');
        const quickAddBtn = document.getElementById('quickAddBtn');
        const detailedAddBtn = document.getElementById('detailedAddBtn');

        quickAddBtn.addEventListener('click', () => {
            const title = taskInput.value.trim();
            const priority = document.getElementById('prioritySelect').value;
            if (title) {
                this.addTask({ title, priority });
            }
        });

        detailedAddBtn.addEventListener('click', () => {
            const title = taskInput.value.trim();
            if (title) {
                document.getElementById('editTaskInput').value = title;
            }
            this.openNewTaskModal();
        });

        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const title = taskInput.value.trim();
                const priority = document.getElementById('prioritySelect').value;
                if (title) {
                    this.addTask({ title, priority });
                }
            }
        });

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.setSearchQuery(e.target.value);
        });

        // Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setFilter(btn.dataset.filter);
            });
        });

        // Bulk actions
        document.getElementById('selectAllBtn').addEventListener('click', () => {
            this.selectAllVisibleTasks();
        });

        document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
            if (this.selectedTasks.size > 0) {
                const count = this.selectedTasks.size;
                if (confirm(`Are you sure you want to delete ${count} selected task(s)?`)) {
                    this.deleteSelectedTasks();
                }
            }
        });

        document.getElementById('clearCompletedBtn').addEventListener('click', () => {
            const completedCount = this.tasks.filter(t => t.completed).length;
            if (completedCount > 0) {
                if (confirm(`Are you sure you want to clear ${completedCount} completed task(s)?`)) {
                    this.clearCompletedTasks();
                }
            }
        });

        // Modal events
        document.getElementById('modalClose').addEventListener('click', () => this.closeEditModal());
        document.getElementById('modalCancel').addEventListener('click', () => this.closeEditModal());
        document.getElementById('modalSave').addEventListener('click', () => this.saveEditedTask());

        // Enhanced modal events
        document.getElementById('addSubtaskBtn').addEventListener('click', () => this.addSubtaskToModal());

        document.getElementById('editEstimatedTime').addEventListener('change', () => {
            this.toggleCustomTimeInput();
        });

        document.getElementById('editRecurring').addEventListener('change', () => {
            this.toggleRecurringOptions();
        });

        // Modal overlay click to close
        document.getElementById('taskModal').addEventListener('click', (e) => {
            if (e.target.id === 'taskModal') {
                this.closeEditModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Esc to close modal
            if (e.key === 'Escape') {
                this.closeEditModal();
            }

            // Ctrl+A to select all (when not in input)
            if (e.ctrlKey && e.key === 'a' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.selectAllVisibleTasks();
            }

            // Delete to remove selected
            if (e.key === 'Delete' && this.selectedTasks.size > 0 && !e.target.matches('input, textarea')) {
                const count = this.selectedTasks.size;
                if (confirm(`Delete ${count} selected task(s)?`)) {
                    this.deleteSelectedTasks();
                }
            }

            // Ctrl+N for new detailed task
            if (e.ctrlKey && e.key === 'n' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.openNewTaskModal();
            }
        });

        // Load theme on startup
        this.loadTheme();
    }

    // ===== UTILITY FUNCTIONS =====
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    }

    showWelcomeMessage() {
        if (this.tasks.length === 0) {
            setTimeout(() => {
                this.showToast('Welcome to TaskMaster Pro! Add your first task to get started 🚀', 'success', 5000);
            }, 1000);
        }
    }

    // ===== EXPORT/IMPORT FUNCTIONALITY =====
    exportTasks() {
        const dataStr = JSON.stringify(this.tasks, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `taskmaster-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        URL.revokeObjectURL(url);
        this.showToast('Tasks exported successfully', 'success');
    }

    importTasks(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedTasks = JSON.parse(e.target.result);
                if (Array.isArray(importedTasks)) {
                    this.tasks = [...this.tasks, ...importedTasks];
                    this.saveTasks();
                    this.updateUI();
                    this.showToast(`Imported ${importedTasks.length} tasks successfully`, 'success');
                } else {
                    throw new Error('Invalid file format');
                }
            } catch (error) {
                this.showToast('Error importing tasks: Invalid file format', 'error');
            }
        };
        reader.readAsText(file);
    }

    // ===== STATISTICS =====
    getProductivityStats() {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);

        const todayCompleted = this.tasks.filter(t =>
            t.completed && t.completedAt && t.completedAt.startsWith(todayStr)
        ).length;

        const weekCompleted = this.tasks.filter(t =>
            t.completed && t.completedAt && new Date(t.completedAt) >= weekAgo
        ).length;

        const totalCompleted = this.tasks.filter(t => t.completed).length;
        const completionRate = this.tasks.length > 0 ?
            Math.round((totalCompleted / this.tasks.length) * 100) : 0;

        return {
            todayCompleted,
            weekCompleted,
            totalCompleted,
            completionRate,
            totalTasks: this.tasks.length
        };
    }
}

// ===== GLOBAL FUNCTIONS =====
let taskManager;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    taskManager = new TaskManager();

    // Add some enhanced sample tasks for demo (only if no existing tasks)
    if (taskManager.tasks.length === 0) {
        setTimeout(() => {
            // Welcome task
            taskManager.addTask({
                title: '🎉 Welcome to TaskMaster Pro!',
                description: 'Explore all the amazing features of your new productivity companion. Try editing this task to see the detailed options available.',
                priority: 'medium',
                category: 'personal',
                tags: 'welcome, demo, getting-started',
                estimatedTime: 15,
                subtasks: [
                    { title: 'Explore the task editing modal', completed: false },
                    { title: 'Try different priority levels', completed: false },
                    { title: 'Add your first real task', completed: false }
                ]
            }, true);

            // Sample work task
            taskManager.addTask({
                title: '📊 Prepare quarterly report',
                description: 'Compile sales data, analyze trends, and create presentation for stakeholders meeting.',
                priority: 'high',
                category: 'work',
                tags: 'report, quarterly, presentation, meeting',
                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
                estimatedTime: 240,
                location: 'Conference Room A',
                subtasks: [
                    { title: 'Gather sales data from Q1-Q3', completed: true },
                    { title: 'Analyze growth trends', completed: false },
                    { title: 'Create PowerPoint presentation', completed: false },
                    { title: 'Review with manager', completed: false }
                ]
            }, true);

            // Health task
            taskManager.addTask({
                title: '🏃‍♂️ Morning workout routine',
                description: 'Complete 30-minute cardio session and strength training.',
                priority: 'medium',
                category: 'health',
                tags: 'fitness, health, routine, morning',
                recurring: true,
                recurrencePattern: 'daily',
                estimatedTime: 30,
                location: 'Home Gym'
            }, true);

            // Urgent task
            taskManager.addTask({
                title: '⚡ Fix critical bug in production',
                description: 'Users are reporting login issues. Need immediate investigation and hotfix deployment.',
                priority: 'urgent',
                category: 'work',
                tags: 'bug, critical, production, hotfix',
                dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
                estimatedTime: 120,
                url: 'https://github.com/project/issues/123'
            }, true);

            // Shopping task
            taskManager.addTask({
                title: '🛒 Weekly grocery shopping',
                description: 'Buy groceries for the week including fresh vegetables, fruits, and household items.',
                priority: 'low',
                category: 'shopping',
                tags: 'groceries, weekly, food, household',
                location: 'Whole Foods Market',
                estimatedTime: 60,
                subtasks: [
                    { title: 'Fresh vegetables and fruits', completed: false },
                    { title: 'Dairy products', completed: false },
                    { title: 'Cleaning supplies', completed: false },
                    { title: 'Snacks for the week', completed: false }
                ]
            }, true);
        }, 500);
    }
});

// Service Worker for offline functionality (Progressive Web App)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
