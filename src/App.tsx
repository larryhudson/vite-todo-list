import React, { useState, useEffect, useRef, useCallback } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import './App.css'

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  dueDate: Date;
}

type FilterStatus = 'all' | 'active' | 'completed';

interface DraggableItemProps {
  id: string;
  index: number;
  moveItem: (dragIndex: number, hoverIndex: number, fromGroup: string, toGroup: string) => void;
  children: React.ReactNode;
  group: 'today' | 'tomorrow' | 'upcoming';
}

const DraggableItem: React.FC<DraggableItemProps> = ({ id, index, moveItem, children, group }) => {
  const ref = useRef<HTMLLIElement>(null)

  const [, drop] = useDrop({
    accept: ['TODO_TODAY', 'TODO_TOMORROW', 'TODO_UPCOMING'],
    hover(item: { id: string; index: number; group: string }, monitor) {
      if (!ref.current) {
        return
      }
      const dragIndex = item.index
      const hoverIndex = index
      const fromGroup = item.group
      const toGroup = group

      if (dragIndex === hoverIndex && fromGroup === toGroup) {
        return
      }

      moveItem(dragIndex, hoverIndex, fromGroup, toGroup)
      item.index = hoverIndex
      item.group = toGroup
    },
  })

  const [{ isDragging }, drag, preview] = useDrag({
    type: `TODO_${group.toUpperCase()}`,
    item: () => ({ id, index, group }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  drag(drop(ref))

  return (
    <li ref={preview} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <span ref={ref} className="drag-handle">☰</span>
      {children}
    </li>
  )
}

function App() {
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

  const [todos, setTodos] = useState<Todo[]>(loadTodosFromLocalStorage())
  const [newTodo, setNewTodo] = useState('')
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [darkMode, setDarkMode] = useState<boolean>(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [completedTodoId, setCompletedTodoId] = useState<string | null>(null)
  
  const getFilterButtonClass = (status: FilterStatus) => {
    return `filter-button ${filterStatus === status ? 'active' : ''}`
  }
  const fileInputRef = useRef<HTMLInputElement>(null)
  const completionTimeoutRef = useRef<number | null>(null)

  const moveItem = useCallback((dragIndex: number, hoverIndex: number, fromGroup: string, toGroup: string) => {
    setTodos((prevTodos) => {
      const newTodos = [...prevTodos];
      let fromGroupTodos: Todo[];
      let toGroupTodos: Todo[];

      if (fromGroup === 'today') {
        fromGroupTodos = newTodos.filter(isDueOrOverdue);
      } else if (fromGroup === 'tomorrow') {
        fromGroupTodos = newTodos.filter(todo => isTomorrow(todo.dueDate));
      } else {
        fromGroupTodos = newTodos.filter(todo => !isDueOrOverdue(todo) && !isTomorrow(todo.dueDate));
      }

      if (toGroup === 'today') {
        toGroupTodos = newTodos.filter(isDueOrOverdue);
      } else if (toGroup === 'tomorrow') {
        toGroupTodos = newTodos.filter(todo => isTomorrow(todo.dueDate));
      } else {
        toGroupTodos = newTodos.filter(todo => !isDueOrOverdue(todo) && !isTomorrow(todo.dueDate));
      }

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
        draggedItem.dueDate = today;
      } else if (toGroup === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        draggedItem.dueDate = tomorrow;
      } else if (toGroup === 'upcoming') {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        draggedItem.dueDate = nextWeek;
      }

      toGroupTodos.splice(hoverIndex, 0, draggedItem);

      // Create a map of todo IDs to their new positions within the group
      const todoPositions = new Map(toGroupTodos.map((todo, index) => [todo.id, index]));

      // Update the order of todos in the original array
      newTodos.sort((a, b) => {
        const posA = todoPositions.get(a.id);
        const posB = todoPositions.get(b.id);
        if (posA !== undefined && posB !== undefined) {
          return posA - posB;
        }
        return 0;
      });

      return newTodos;
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
      <button className="dark-mode-toggle" onClick={toggleDarkMode}>
        {darkMode ? '☀️' : '🌙'}
      </button>
      <h1>To-Do List</h1>
      <div className="import-export-buttons">
        <button onClick={exportTodos}>Export Todos</button>
        <button onClick={() => fileInputRef.current?.click()}>Import Todos</button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={importTodos}
          accept=".json"
        />
      </div>
      <form onSubmit={addTodo}>
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new todo"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>
      <div className="filter-buttons">
        <button className={getFilterButtonClass('all')} onClick={() => setFilterStatus('all')}>All</button>
        <button className={getFilterButtonClass('active')} onClick={() => setFilterStatus('active')}>Active</button>
        <button className={getFilterButtonClass('completed')} onClick={() => setFilterStatus('completed')}>Completed</button>
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
                    />
                    <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
                      {todo.text} (Due: {todo.dueDate.toLocaleDateString()})
                    </span>
                    {completedTodoId === todo.id && (
                      <span className="completion-message" style={{ textDecoration: 'none' }}>Good job!</span>
                    )}
                    <button onClick={() => setEditingTodo(todo)}>Edit</button>
                    <button onClick={() => deleteTodo(todo.id)}>Delete</button>
                  </DraggableItem>
                ))}
              </ul>
            </React.Fragment>
          );
        })}
      </DndProvider>
      {editingTodo && (
        <div className="edit-form">
          <h3>Edit Todo</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const newText = (form.elements.namedItem('editText') as HTMLInputElement).value;
            const newDueDate = new Date((form.elements.namedItem('editDueDate') as HTMLInputElement).value);
            editTodo(editingTodo.id, newText, newDueDate);
          }}>
            <input
              type="text"
              name="editText"
              defaultValue={editingTodo.text}
            />
            <input
              type="date"
              name="editDueDate"
              defaultValue={editingTodo.dueDate.toISOString().split('T')[0]}
            />
            <button type="submit">Save</button>
            <button type="button" onClick={() => setEditingTodo(null)}>Cancel</button>
          </form>
        </div>
      )}
    </div>
  )
}

export default App
