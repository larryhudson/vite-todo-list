// Import necessary dependencies from React and other libraries
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import './App.css'

// Add this at the beginning of the file
const SkipLink: React.FC = () => (
  <a href="#main-content" className="skip-link">
    Skip to main content
  </a>
)

// Define interfaces and types

// Add this style block at the end of the file
const styles = `
  .drag-handle {
    cursor: move;
    padding: 0 5px;
    margin-right: 5px;
    display: inline-block;
    position: relative;
  }

  .drag-over {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .drop-placeholder {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background-color: #007bff;
  }
`;

// Add this line at the end of the App component, just before the closing return parenthesis
<style>{styles}</style>

// Define the structure of a Todo item
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  dueDate: Date;
}

// Define possible filter statuses
type FilterStatus = 'all' | 'active' | 'completed';

// Define props for the DraggableItem component
interface DraggableItemProps {
  id: string;
  index: number;
  moveItem: (dragIndex: number, hoverIndex: number, fromGroup: string, toGroup: string) => void;
  children: React.ReactNode;
  group: 'today' | 'tomorrow' | 'upcoming';
}

// DraggableItem component for drag and drop functionality

const DraggableItem: React.FC<DraggableItemProps> = ({ id, index, moveItem, children, group }) => {
  const ref = useRef<HTMLLIElement>(null)

  // Set up drop functionality
  const [{ isOver }, drop] = useDrop({
    accept: ['TODO_TODAY', 'TODO_TOMORROW', 'TODO_UPCOMING'],
    hover(item: { id: string; index: number; group: string }, monitor) {
      if (!ref.current) {
        return
      }
      const dragIndex = item.index
      const hoverIndex = index
      const fromGroup = item.group
      const toGroup = group

      // Don't replace items with themselves
      if (dragIndex === hoverIndex && fromGroup === toGroup) {
        return
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect()
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
      // Determine mouse position
      const clientOffset = monitor.getClientOffset()
      // Get pixels to the top
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return
      }

      // Time to actually perform the action
      moveItem(dragIndex, hoverIndex, fromGroup, toGroup)
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex
      item.group = toGroup
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  })

  // Set up drag functionality
  const [{ isDragging }, drag, preview] = useDrag({
    type: `TODO_${group.toUpperCase()}`,
    item: () => ({ id, index, group }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  // Initialize drag and drop on the same element
  drag(drop(ref))

  return (
    <li ref={preview} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <div ref={ref} className={`drag-handle ${isOver ? 'drag-over' : ''}`}>
        ☰
        {isOver && <div className="drop-placeholder" />}
      </div>
      {children}
    </li>
  )
}

function App() {
  // Function to load todos from localStorage
  const loadTodosFromLocalStorage = (): Todo[] => {
    const storedTodos = localStorage.getItem('todos')
    if (storedTodos) {
      return JSON.parse(storedTodos).map((todo: Todo) => ({
        ...todo,
        id: todo.id.toString(),
        dueDate: new Date(todo.dueDate)
      }))
    }
    return []
  }

  // State variables
  const [todos, setTodos] = useState<Todo[]>(loadTodosFromLocalStorage())
  const [newTodo, setNewTodo] = useState('')
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [darkMode, setDarkMode] = useState<boolean>(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [completedTodoId, setCompletedTodoId] = useState<string | null>(null)
  
  // Helper function to get the class for filter buttons
  const getFilterButtonClass = (status: FilterStatus) => {
    return `filter-button ${filterStatus === status ? 'active' : ''}`
  }
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const completionTimeoutRef = useRef<number | null>(null)

  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }

  const isTomorrow = (date: Date) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear()
  }

  const isDueOrOverdue = (todo: Todo) => {
    const today = new Date()
    return todo.dueDate <= today || isToday(todo.dueDate)
  }

  const moveItem = useCallback((dragIndex: number, hoverIndex: number, fromGroup: string, toGroup: string) => {
    setTodos((prevTodos) => {
      const newTodos = [...prevTodos];
      const getGroupTodos = (group: string) => {
        if (group === 'today') return newTodos.filter(isDueOrOverdue);
        if (group === 'tomorrow') return newTodos.filter(todo => isTomorrow(todo.dueDate));
        return newTodos.filter(todo => !isDueOrOverdue(todo) && !isTomorrow(todo.dueDate));
      };

      const fromGroupTodos = getGroupTodos(fromGroup);
      const toGroupTodos = getGroupTodos(toGroup);

      if (dragIndex < 0 || dragIndex >= fromGroupTodos.length) {
        console.error('Invalid dragIndex:', dragIndex);
        return prevTodos;
      }

      const [draggedItem] = fromGroupTodos.splice(dragIndex, 1);

      if (!draggedItem) {
        console.error('No item found at dragIndex:', dragIndex);
        return prevTodos;
      }

      // Update the due date based on the new group
      const today = new Date();
      if (toGroup === 'today') {
        draggedItem.dueDate = new Date(today);
      } else if (toGroup === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        draggedItem.dueDate = new Date(tomorrow);
      } else if (toGroup === 'upcoming') {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        draggedItem.dueDate = new Date(nextWeek);
      }

      toGroupTodos.splice(hoverIndex, 0, draggedItem);

      // Create a new array with updated todos
      return newTodos.map(todo => {
        if (todo.id === draggedItem.id) {
          return draggedItem;
        }
        return todo;
      });
    });
  }, [isDueOrOverdue, isTomorrow]);

  useEffect(() => {
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
    setDarkMode(prefersDarkMode)
  }, [])

  const exportTodos = () => {
    const dataStr = JSON.stringify(todos)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = 'todos.json'
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const importTodos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result
        if (typeof content === 'string') {
          try {
            const importedTodos = JSON.parse(content).map((todo: Todo) => ({
              ...todo,
              dueDate: new Date(todo.dueDate)
            }))
            setTodos(importedTodos)
          } catch (error) {
            console.error('Error parsing JSON:', error)
            alert('Invalid JSON file')
          }
        }
      }
      reader.readAsText(file)
    }
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const saveTodosToLocalStorage = (todos: Todo[]) => {
    localStorage.setItem('todos', JSON.stringify(todos))
  }

  useEffect(() => {
    saveTodosToLocalStorage(todos)
  }, [todos])

  const addTodo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (newTodo.trim() !== '') {
      const newTodos = [...todos, { id: Date.now().toString(), text: newTodo, completed: false, dueDate: new Date(dueDate) }]
      setTodos(newTodos)
      setNewTodo('')
      setDueDate(new Date().toISOString().split('T')[0])
    }
  }

  const todayTodos = todos.filter(isDueOrOverdue)
  const tomorrowTodos = todos.filter(todo => isTomorrow(todo.dueDate))
  const upcomingTodos = todos.filter(todo => !isDueOrOverdue(todo) && !isTomorrow(todo.dueDate))

  const filterTodos = (todos: Todo[]): Todo[] => {
    switch (filterStatus) {
      case 'active':
        return todos.filter(todo => !todo.completed);
      case 'completed':
        return todos.filter(todo => todo.completed);
      default:
        return todos;
    }
  }

  const toggleTodo = (id: string) => {
    const newTodos = todos.map(todo => {
      if (todo.id === id) {
        const updatedTodo = { ...todo, completed: !todo.completed };
        if (updatedTodo.completed) {
          setCompletedTodoId(id);
          if (completionTimeoutRef.current) {
            clearTimeout(completionTimeoutRef.current);
          }
          completionTimeoutRef.current = window.setTimeout(() => {
            setCompletedTodoId(null);
            completionTimeoutRef.current = null;
          }, 2000);
        } else {
          // Immediately hide the message and cancel the timeout when uncompleting
          if (completionTimeoutRef.current) {
            clearTimeout(completionTimeoutRef.current);
            completionTimeoutRef.current = null;
          }
          setCompletedTodoId(null);
        }
        return updatedTodo;
      }
      return todo;
    });
    setTodos(newTodos);
  }

  const deleteTodo = (id: string) => {
    const newTodos = todos.filter(todo => todo.id !== id)
    setTodos(newTodos)
    if (newTodos.length === 0) {
      localStorage.removeItem('todos')
    }
  }

  const editTodo = (id: string, newText: string, newDueDate: Date) => {
    const newTodos = todos.map(todo =>
      todo.id === id ? { ...todo, text: newText, dueDate: newDueDate } : todo
    )
    setTodos(newTodos)
    setEditingTodo(null)
  }

  return (
    <div className="App">
      <SkipLink />
      <button 
        className="dark-mode-toggle" 
        onClick={toggleDarkMode}
        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {darkMode ? '☀️' : '🌙'}
      </button>
      <h1>To-Do List</h1>
      <main id="main-content">
      <div className="import-export-buttons">
        <button onClick={exportTodos} aria-label="Export Todos">Export Todos</button>
        <button onClick={() => fileInputRef.current?.click()} aria-label="Import Todos">Import Todos</button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={importTodos}
          accept=".json"
          aria-label="Choose file to import"
        />
      </div>
      <form onSubmit={addTodo}>
        <label htmlFor="new-todo">New Todo:</label>
        <input
          id="new-todo"
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new todo"
        />
        <label htmlFor="due-date">Due Date:</label>
        <input
          id="due-date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button type="submit">Add Todo</button>
      </form>
      <div className="filter-buttons" role="group" aria-label="Filter todos">
        <button className={getFilterButtonClass('all')} onClick={() => setFilterStatus('all')} aria-pressed={filterStatus === 'all'}>All</button>
        <button className={getFilterButtonClass('active')} onClick={() => setFilterStatus('active')} aria-pressed={filterStatus === 'active'}>Active</button>
        <button className={getFilterButtonClass('completed')} onClick={() => setFilterStatus('completed')} aria-pressed={filterStatus === 'completed'}>Completed</button>
      </div>
      <div aria-live="polite" className="sr-only">
        {completedTodoId && <p>Todo marked as completed. Good job!</p>}
      </div>
      <DndProvider backend={HTML5Backend}>
        {['today', 'tomorrow', 'upcoming'].map((group) => {
          const todos = group === 'today' ? todayTodos :
                        group === 'tomorrow' ? tomorrowTodos : upcomingTodos;
          return filterTodos(todos).length > 0 && (
            <React.Fragment key={group}>
              <h2>{group.charAt(0).toUpperCase() + group.slice(1)}</h2>
              <ul>
                {filterTodos(todos).map((todo, index) => (
                  <DraggableItem 
                    key={todo.id} 
                    id={todo.id} 
                    index={index} 
                    moveItem={(dragIndex, hoverIndex, fromGroup, toGroup) => moveItem(dragIndex, hoverIndex, fromGroup, toGroup)} 
                    group={group as 'today' | 'tomorrow' | 'upcoming'}
                  >
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => toggleTodo(todo.id)}
                      aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
                    />
                    <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
                      {todo.text} (Due: {todo.dueDate.toLocaleDateString()})
                    </span>
                    <button onClick={() => setEditingTodo(todo)} aria-label={`Edit "${todo.text}"`}>Edit</button>
                    <button onClick={() => deleteTodo(todo.id)} aria-label={`Delete "${todo.text}"`}>Delete</button>
                  </DraggableItem>
                ))}
              </ul>
            </React.Fragment>
          );
        })}
      </DndProvider>
      {editingTodo && (
        <div className="edit-form" role="dialog" aria-labelledby="edit-form-title">
          <h3 id="edit-form-title">Edit Todo</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const newText = (form.elements.namedItem('editText') as HTMLInputElement).value;
            const newDueDate = new Date((form.elements.namedItem('editDueDate') as HTMLInputElement).value);
            editTodo(editingTodo.id, newText, newDueDate);
          }}>
            <label htmlFor="edit-text">Todo text:</label>
            <input
              id="edit-text"
              type="text"
              name="editText"
              defaultValue={editingTodo.text}
            />
            <label htmlFor="edit-due-date">Due date:</label>
            <input
              id="edit-due-date"
              type="date"
              name="editDueDate"
              defaultValue={editingTodo.dueDate.toISOString().split('T')[0]}
            />
            <button type="submit">Save</button>
            <button type="button" onClick={() => setEditingTodo(null)}>Cancel</button>
          </form>
        </div>
      )}
      </main>
    </div>
  )
}

export default App
