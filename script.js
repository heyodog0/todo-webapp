let blocks = JSON.parse(localStorage.getItem('blocks')) || [
    {id: 1, title: "Test Block", color: "#ffffff", tasks: []}
];

function render() {
    document.getElementById('app').innerHTML = blocks.map(b => `
        <div class="block" style="background-color:${b.color}" data-id="${b.id}">
            <div class="block-header">
                <h2 class="block-title" contenteditable oninput="updateBlockTitle(${b.id}, this.textContent)">${b.title}</h2>
                <input type="color" class="color-picker" value="${b.color}" onchange="updateBlockColor(${b.id}, this.value)">
                <button onclick="deleteBlock(${b.id})">×</button>
            </div>
            <div class="add-task">
                <input type="text" placeholder="Add task" onkeypress="if(event.key==='Enter')addTask(${b.id}, this.value)">
                <button onclick="addTask(${b.id}, this.previousElementSibling.value)">+</button>
            </div>
            <div class="tasks-container" data-block-id="${b.id}">
                ${renderTasks(b.tasks, b.id)}
            </div>
        </div>
    `).join('');
    saveToLocalStorage();
}

function renderTasks(tasks, blockId, isSubtask = false) {
    return tasks.map(t => `
        <div class="task ${isSubtask ? 'subtask' : ''} ${t.completed ? 'completed' : ''}" data-id="${t.id}" data-block-id="${blockId}">
            <div class="task-header">
                <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask(${blockId}, ${t.id})">
                <span contenteditable oninput="updateTask(${blockId}, ${t.id}, this.textContent)">${t.text}</span>
                <button onclick="moveTaskToTop(${blockId}, ${t.id})">↑</button>
                <button onclick="addSubtask(${blockId}, ${t.id})">+</button>
                <button onclick="deleteTask(${blockId}, ${t.id})">×</button>
            </div>
            <div class="task-details" contenteditable oninput="updateTaskDetails(${blockId}, ${t.id}, this.textContent)">${t.details || ''}</div>
            ${t.subtasks ? renderTasks(t.subtasks, blockId, true) : ''}
        </div>
    `).join('');
}

function toggleTask(blockId, taskId) {
    const block = blocks.find(b => b.id === blockId);
    const task = findTask(taskId, block.tasks);
    if (task) {
        task.completed = !task.completed;
        sortTasks(block.tasks);
        render();
    }
}

function sortTasks(tasks) {
    tasks.sort((a, b) => {
        if (a.completed === b.completed) return 0;
        return a.completed ? 1 : -1;
    });
    tasks.forEach(task => {
        if (task.subtasks && task.subtasks.length > 0) {
            sortTasks(task.subtasks);
        }
    });
}

function updateTask(blockId, taskId, newText) {
    const block = blocks.find(b => b.id === blockId);
    const task = findTask(taskId, block.tasks);
    if (task) {
        task.text = newText;
        saveToLocalStorage();
    }
}

function updateTaskDetails(blockId, taskId, value) {
    const block = blocks.find(b => b.id === blockId);
    const task = findTask(taskId, block.tasks);
    if (task) {
        task.details = value;
        saveToLocalStorage();
    }
}

function updateBlockTitle(id, newTitle) {
    const block = blocks.find(b => b.id === id);
    if (block) {
        block.title = newTitle;
        saveToLocalStorage();
    }
}

function updateBlockColor(id, newColor) {
    const block = blocks.find(b => b.id === id);
    if (block) {
        block.color = newColor;
        render();
    }
}

function addTask(blockId, text) {
    if (text.trim()) {
        const block = blocks.find(b => b.id === blockId);
        if (block) {
            block.tasks.push({id: Date.now(), text, completed: false, subtasks: [], details: ''});
            render();
        }
    }
}

function addSubtask(blockId, parentId) {
    const block = blocks.find(b => b.id === blockId);
    const parent = findTask(parentId, block.tasks);
    if (parent) {
        parent.subtasks = parent.subtasks || [];
        parent.subtasks.push({id: Date.now(), text: "New subtask", completed: false, details: ''});
        render();
    }
}

function addBlock() {
    const title = document.getElementById('newBlockTitle').value;
    const color = document.getElementById('newBlockColor').value;
    if (title.trim()) {
        blocks.push({id: Date.now(), title, color, tasks: []});
        render();
        document.getElementById('newBlockTitle').value = '';
        document.getElementById('newBlockColor').value = '#ffffff';
    }
}

function deleteBlock(id) {
    blocks = blocks.filter(b => b.id !== id);
    render();
}

function deleteTask(blockId, taskId) {
    const block = blocks.find(b => b.id === blockId);
    if (block) {
        block.tasks = deleteTaskRecursive(taskId, block.tasks);
        render();
    }
}

function deleteTaskRecursive(taskId, tasks) {
    return tasks.filter(t => {
        if (t.id === taskId) return false;
        if (t.subtasks) t.subtasks = deleteTaskRecursive(taskId, t.subtasks);
        return true;
    });
}

function findTask(id, tasks) {
    for (let task of tasks) {
        if (task.id === id) return task;
        if (task.subtasks) {
            const found = findTask(id, task.subtasks);
            if (found) return found;
        }
    }
    return null;
}

function moveTaskToTop(blockId, taskId) {
    const block = blocks.find(b => b.id === blockId);
    if (block) {
        const taskIndex = block.tasks.findIndex(t => t.id === taskId);
        if (taskIndex > 0) {
            const [task] = block.tasks.splice(taskIndex, 1);
            block.tasks.unshift(task);
            render();
        }
    }
}

function saveToLocalStorage() {
    localStorage.setItem('blocks', JSON.stringify(blocks));
}

render();