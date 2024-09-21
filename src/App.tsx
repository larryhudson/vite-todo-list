import { useState, useEffect } from 'react'
import './App.css'

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  dueDate: Date;
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0])

  const loadTodosFromLocalStorage = (): Todo[] => {
    const storedTodos = localStorage.getItem('todos')
    if (storedTodos) {
      return JSON.parse(storedTodos).map((todo: Todo) => ({
        ...todo,
        dueDate: new Date(todo.dueDate)
      }))
    }
    return []
  }

  const saveTodosToLocalStorage = (todos: Todo[]) => {
    localStorage.setItem('todos', JSON.stringify(todos))
  }

  useEffect(() => {
    setTodos(loadTodosFromLocalStorage())
  }, [])

  useEffect(() => {
    saveTodosToLocalStorage(todos)
  }, [todos])

  const addTodo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (newTodo.trim() !== '') {
      const newTodos = [...todos, { id: Date.now(), text: newTodo, completed: false, dueDate: new Date(dueDate) }]
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

  const toggleTodo = (id: number) => {
    const newTodos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )
    setTodos(newTodos)
  }

  const deleteTodo = (id: number) => {
    const newTodos = todos.filter(todo => todo.id !== id)
    setTodos(newTodos)
  }

  return (
    <div className="App">
      <h1>To-Do List</h1>
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
      {todayTodos.length > 0 && (
        <>
          <h2>Today</h2>
          <ul>
            {todayTodos.map(todo => (
              <li key={todo.id}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                />
                <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
                  {todo.text} (Due: {todo.dueDate.toLocaleDateString()})
                </span>
                <button onClick={() => deleteTodo(todo.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </>
      )}
      {tomorrowTodos.length > 0 && (
        <>
          <h2>Tomorrow</h2>
          <ul>
            {tomorrowTodos.map(todo => (
              <li key={todo.id}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                />
                <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
                  {todo.text} (Due: {todo.dueDate.toLocaleDateString()})
                </span>
                <button onClick={() => deleteTodo(todo.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </>
      )}
      {upcomingTodos.length > 0 && (
        <>
          <h2>Upcoming</h2>
          <ul>
            {upcomingTodos.map(todo => (
              <li key={todo.id}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                />
                <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
                  {todo.text} (Due: {todo.dueDate.toLocaleDateString()})
                </span>
                <button onClick={() => deleteTodo(todo.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default App
