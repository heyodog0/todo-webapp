let blocks = JSON.parse(localStorage.getItem('blocks')) || [
    {id: 1, title: "Test Block", color: "#ffffff", tasks: []}
];

function render() {
    document.getElementById('app').innerHTML = blocks
        .filter(b => b && typeof b === 'object' && b.id !== undefined)
        .map(b => `
            <div class="block" style="background-color:${b.color || '#ffffff'}" data-id="${b.id}" draggable="true">
                <div class="block-header">
                    <button class="move-to-top" onclick="moveBlockToTop(${b.id})">^</button>
                    <h2 class="block-title" contenteditable oninput="updateBlockTitle(${b.id}, this.textContent)">${b.title || 'Untitled'}</h2>
                    <input type="color" class="color-picker" value="${b.color || '#ffffff'}" onchange="updateBlockColor(${b.id}, this.value)">
                    <button onclick="deleteBlock(${b.id})">×</button>
                </div>
                <div class="add-task">
                    <input type="text" placeholder="Add task" onkeypress="if(event.key==='Enter')addTask(${b.id}, this.value)">
                    <button onclick="addTask(${b.id}, this.previousElementSibling.value)">+</button>
                </div>
                <div class="tasks-container" data-block-id="${b.id}">
                    ${renderTasks(b.tasks || [], b.id)}
                </div>
            </div>
        `).join('');
    saveToLocalStorage();
    addDragAndDropListeners();
}

function renderTasks(tasks, blockId, blockIndex, isSubtask = false, parentIndex = -1) {
    return tasks.map((t, index) => `
        <div class="task ${isSubtask ? 'subtask' : ''} ${t.completed ? 'completed' : ''}" data-id="${t.id}" data-block-id="${blockId}" data-task-index="${index}">
            <div class="task-header">
                <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask(${blockId}, ${t.id})" 
                       data-block-index="${blockIndex}" data-task-index="${isSubtask ? parentIndex : index}" data-subtask-index="${isSubtask ? index : -1}"
                       title="Toggle task completion (Space)" tabindex="-1">
                <span contenteditable oninput="updateTask(${blockId}, ${t.id}, this.textContent)" 
                      data-block-index="${blockIndex}" data-task-index="${isSubtask ? parentIndex : index}" data-subtask-index="${isSubtask ? index : -1}"
                      title="Edit task" tabindex="-1">${t.text}</span>
                <button onclick="addSubtask(${blockId}, ${t.id})" title="Add subtask (Option + S)" tabindex="-1">+</button>
                <button onclick="deleteTask(${blockId}, ${t.id})" title="Delete task (Option + Backspace)" tabindex="-1">×</button>
            </div>
            <div class="task-details" contenteditable oninput="updateTaskDetails(${blockId}, ${t.id}, this.textContent)" 
                 data-block-index="${blockIndex}" data-task-index="${isSubtask ? parentIndex : index}" data-subtask-index="${isSubtask ? index : -1}"
                 title="Edit task details" tabindex="-1">${t.details || ''}</div>
            ${t.subtasks ? renderTasks(t.subtasks, blockId, blockIndex, true, index) : ''}
        </div>
    `).join('');
}

function focusCurrentBlock() {
    const currentBlock = document.querySelector(`.block[data-block-index="${currentFocus.blockIndex}"] .block-title`);
    if (currentBlock) {
        currentBlock.focus();
    }
}

// let currentFocus = { blockIndex: 0, taskIndex: -1, subtaskIndex: -1 };

function handleGlobalKeydown(event) {
    const { key, shiftKey, altKey } = event;
    
    if (shiftKey && !altKey) {
        // Block-level navigation
        switch (key) {
            case 'ArrowUp':
                event.preventDefault();
                moveBlockFocusUp();
                break;
            case 'ArrowDown':
                event.preventDefault();
                moveBlockFocusDown();
                break;
        }
    } else if (altKey && shiftKey) {
        // Within-block navigation
        switch (key) {
            case 'ArrowUp':
                event.preventDefault();
                moveTaskFocusUp();
                break;
            case 'ArrowDown':
                event.preventDefault();
                moveTaskFocusDown();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                moveTaskFocusLeft();
                break;
            case 'ArrowRight':
                event.preventDefault();
                moveTaskFocusRight();
                break;
        }
    } else if (altKey) {
        // Task operations
        switch (key) {
            case 'Enter':
                event.preventDefault();
                addNewTask();
                break;
            case 'Backspace':
                event.preventDefault();
                deleteCurrentItem();
                break;
            case 't':
                event.preventDefault();
                moveBlockToTop(getCurrentBlockId());
                break;
            case 'd':
                event.preventDefault();
                deleteBlock(getCurrentBlockId());
                break;
            case 's':
                event.preventDefault();
                addSubtaskToCurrent();
                break;
        }
    } else if (key === 'Enter' && event.target.classList.contains('add-task-input')) {
        addTask(getCurrentBlockId(), event.target.value);
        event.target.value = '';
    } else if (key === ' ' && event.target.type === 'checkbox') {
        event.preventDefault();
        event.target.click();
    }
}

function moveBlockFocusUp() {
    if (currentFocus.blockIndex > 0) {
        currentFocus.blockIndex--;
        currentFocus.taskIndex = -1;
        currentFocus.subtaskIndex = -1;
        focusCurrentBlock();
    }
}

function moveBlockFocusDown() {
    if (currentFocus.blockIndex < blocks.length - 1) {
        currentFocus.blockIndex++;
        currentFocus.taskIndex = -1;
        currentFocus.subtaskIndex = -1;
        focusCurrentBlock();
    }
}

function moveTaskFocusUp() {
    const currentBlock = blocks[currentFocus.blockIndex];
    if (currentFocus.taskIndex > 0) {
        currentFocus.taskIndex--;
        currentFocus.subtaskIndex = -1;
    } else if (currentFocus.taskIndex === -1 && currentBlock.tasks.length > 0) {
        currentFocus.taskIndex = currentBlock.tasks.length - 1;
    }
    focusCurrentTask();
}

function moveTaskFocusDown() {
    const currentBlock = blocks[currentFocus.blockIndex];
    if (currentFocus.taskIndex === -1 && currentBlock.tasks.length > 0) {
        currentFocus.taskIndex = 0;
    } else if (currentFocus.taskIndex < currentBlock.tasks.length - 1) {
        currentFocus.taskIndex++;
        currentFocus.subtaskIndex = -1;
    }
    focusCurrentTask();
}

function moveTaskFocusLeft() {
    if (currentFocus.subtaskIndex > -1) {
        currentFocus.subtaskIndex = -1;
    } else if (currentFocus.taskIndex > -1) {
        currentFocus.taskIndex = -1;
    }
    focusCurrentTask();
}

function moveTaskFocusRight() {
    const currentBlock = blocks[currentFocus.blockIndex];
    if (currentFocus.taskIndex === -1 && currentBlock.tasks.length > 0) {
        currentFocus.taskIndex = 0;
    } else if (currentFocus.taskIndex > -1) {
        const currentTask = currentBlock.tasks[currentFocus.taskIndex];
        if (currentTask.subtasks && currentTask.subtasks.length > 0 && currentFocus.subtaskIndex === -1) {
            currentFocus.subtaskIndex = 0;
        }
    }
    focusCurrentTask();
}

function focusCurrentBlock() {
    const blockTitle = document.querySelector(`.block:nth-child(${currentFocus.blockIndex + 1}) .block-title`);
    if (blockTitle) {
        blockTitle.focus();
    }
}

function focusCurrentTask() {
    let selector = `.block:nth-child(${currentFocus.blockIndex + 1}) `;
    if (currentFocus.taskIndex > -1) {
        selector += `.task:nth-child(${currentFocus.taskIndex + 1}) `;
        if (currentFocus.subtaskIndex > -1) {
            selector += `.subtask:nth-child(${currentFocus.subtaskIndex + 1}) `;
        }
        selector += 'span';
    } else {
        selector += '.block-title';
    }
    const element = document.querySelector(selector);
    if (element) {
        element.focus();
    }
}

function focusCurrentElement() {
    let selector = `.block:nth-child(${currentFocus.blockIndex + 1}) `;
    if (currentFocus.taskIndex > -1) {
        selector += `.task:nth-child(${currentFocus.taskIndex + 1}) `;
        if (currentFocus.subtaskIndex > -1) {
            selector += `.subtask:nth-child(${currentFocus.subtaskIndex + 1}) `;
        }
        selector += 'span';
    } else {
        selector += '.block-title';
    }
    const element = document.querySelector(selector);
    if (element) element.focus();
}

function addNewTask() {
    const blockId = getCurrentBlockId();
    addTask(blockId, 'New Task');
    render();
    currentFocus.taskIndex = blocks[currentFocus.blockIndex].tasks.length - 1;
    currentFocus.subtaskIndex = -1;
    focusCurrentElement();
}

function deleteCurrentItem() {
    const blockId = getCurrentBlockId();
    if (currentFocus.taskIndex === -1) {
        deleteBlock(blockId);
    } else {
        const taskId = getCurrentTaskId();
        deleteTask(blockId, taskId);
    }
    render();
    focusCurrentElement();
}

function addSubtaskToCurrent() {
    const blockId = getCurrentBlockId();
    const taskId = getCurrentTaskId();
    if (taskId) {
        addSubtask(blockId, taskId);
        render();
        const currentTask = blocks[currentFocus.blockIndex].tasks[currentFocus.taskIndex];
        currentFocus.subtaskIndex = (currentTask.subtasks || []).length - 1;
        focusCurrentElement();
    }
}

function getCurrentBlockId() {
    return blocks[currentFocus.blockIndex].id;
}

function getCurrentTaskId() {
    const currentBlock = blocks[currentFocus.blockIndex];
    if (currentFocus.taskIndex > -1) {
        if (currentFocus.subtaskIndex > -1) {
            return currentBlock.tasks[currentFocus.taskIndex].subtasks[currentFocus.subtaskIndex].id;
        }
        return currentBlock.tasks[currentFocus.taskIndex].id;
    }
    return null;
}

function handleAddTaskKeydown(event, blockId, value) {
    if (event.key === 'Enter' && value.trim()) {
        addTask(blockId, value.trim());
        event.target.value = '';
        render();
    }
}

function moveBlockToTop(id) {
    const blockIndex = blocks.findIndex(b => b && b.id === id);
    if (blockIndex > 0) {
        const [block] = blocks.splice(blockIndex, 1);
        blocks.unshift(block);
        render();
    } else if (blockIndex === -1) {
        console.error(`Block with id ${id} not found`);
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

function deleteBlock(id) {
    blocks = blocks.filter(b => b.id !== id);
    render();
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

function toggleTask(blockId, taskId) {
    const block = blocks.find(b => b.id === blockId);
    const task = findTask(taskId, block.tasks);
    if (task) {
        task.completed = !task.completed;
        sortTasks(block.tasks);
        render();
    }
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

function addSubtask(blockId, parentId) {
    const block = blocks.find(b => b.id === blockId);
    const parent = findTask(parentId, block.tasks);
    if (parent) {
        parent.subtasks = parent.subtasks || [];
        parent.subtasks.push({id: Date.now(), text: "", completed: false, details: ''});
        render();
    }
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

function saveToLocalStorage() {
    localStorage.setItem('blocks', JSON.stringify(blocks));
}

function addDragAndDropListeners() {
    const blockElements = document.querySelectorAll('.block');
    blockElements.forEach(block => {
        block.addEventListener('dragstart', dragStart);
        block.addEventListener('dragover', dragOver);
        block.addEventListener('drop', drop);
    });
}

function dragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
}

function dragOver(e) {
    e.preventDefault();
}

function drop(e) {
    e.preventDefault();
    const draggedBlockId = parseInt(e.dataTransfer.getData('text'));
    const targetBlockId = parseInt(e.currentTarget.dataset.id);
    
    if (draggedBlockId !== targetBlockId) {
        const draggedBlockIndex = blocks.findIndex(b => b.id === draggedBlockId);
        const targetBlockIndex = blocks.findIndex(b => b.id === targetBlockId);
        
        const [draggedBlock] = blocks.splice(draggedBlockIndex, 1);
        blocks.splice(targetBlockIndex, 0, draggedBlock);
        
        render();
    }
}

// Make sure these functions are in the global scope
window.moveBlockToTop = moveBlockToTop;
window.updateBlockTitle = updateBlockTitle;
window.updateBlockColor = updateBlockColor;
window.deleteBlock = deleteBlock;
window.addTask = addTask;
window.toggleTask = toggleTask;
window.updateTask = updateTask;
window.updateTaskDetails = updateTaskDetails;
window.handleAddTaskKeydown = handleAddTaskKeydown;

// Clean up any invalid blocks before initial render
blocks = blocks.filter(b => b && typeof b === 'object' && b.id !== undefined);
saveToLocalStorage();

document.addEventListener('keydown', handleGlobalKeydown);

render();