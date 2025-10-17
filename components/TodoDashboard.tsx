"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

type Tab = "all" | "pending" | "completed";

export default function TodoDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoDescription, setNewTodoDescription] = useState("");
  const [editingId, setEditingId] = useState<Id<"todos"> | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const todos = useQuery(api.todos.list);
  const createTodo = useMutation(api.todos.create);
  const toggleComplete = useMutation(api.todos.toggleComplete);
  const removeTodo = useMutation(api.todos.remove);
  const updateTodo = useMutation(api.todos.update);

  // Keyboard shortcuts for tab navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "1") {
        setActiveTab("all");
      } else if (e.key === "2") {
        setActiveTab("pending");
      } else if (e.key === "3") {
        setActiveTab("completed");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    await createTodo({
      title: newTodoTitle.trim(),
      description: newTodoDescription.trim() || undefined,
      priority: "medium",
    });

    setNewTodoTitle("");
    setNewTodoDescription("");
  };

  const handleStartEdit = (todo: { _id: Id<"todos">; title: string; description?: string }) => {
    setEditingId(todo._id);
    setEditTitle(todo.title);
    setEditDescription(todo.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;

    await updateTodo({
      id: editingId,
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
    });

    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  };

  const filteredTodos = todos?.filter((todo) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return todo.status === "pending";
    if (activeTab === "completed") return todo.status === "completed";
    return true;
  });

  const pendingCount = todos?.filter((t) => t.status === "pending").length || 0;
  const completedCount = todos?.filter((t) => t.status === "completed").length || 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-mona-heading mb-2">My Tasks</h1>
      </div>

      <div className="mb-6 bg-card rounded-lg p-4 border border-border">
        <form onSubmit={handleCreateTodo} className="space-y-3">
          <input
            type="text"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            placeholder="Add a task..."
            className="w-full px-3 py-2 bg-transparent border-none outline-none text-base placeholder:text-muted-foreground"
          />
          {newTodoTitle && (
            <>
              <textarea
                value={newTodoDescription}
                onChange={(e) => setNewTodoDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-3 py-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:opacity-80 transition-opacity"
                >
                  Add Task
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewTodoTitle("");
                    setNewTodoDescription("");
                  }}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 text-sm font-medium transition-colors relative group ${
            activeTab === "all"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            All
            <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              1
            </kbd>
          </span>
          {activeTab === "all" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 text-sm font-medium transition-colors relative group ${
            activeTab === "pending"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            Pending
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-secondary rounded">
                {pendingCount}
              </span>
            )}
            <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              2
            </kbd>
          </span>
          {activeTab === "pending" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2 text-sm font-medium transition-colors relative group ${
            activeTab === "completed"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            Completed
            {completedCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-secondary rounded">
                {completedCount}
              </span>
            )}
            <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              3
            </kbd>
          </span>
          {activeTab === "completed" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      <div className="space-y-2">
        {!filteredTodos ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : filteredTodos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {activeTab === "completed"
              ? "No completed tasks"
              : activeTab === "pending"
              ? "No pending tasks"
              : "No tasks yet. Add one above!"}
          </div>
        ) : (
          filteredTodos.map((todo) => (
            <div
              key={todo._id}
              className="group bg-card rounded-lg p-4 border border-border hover:border-muted-foreground transition-colors"
            >
              {editingId === todo._id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-2 py-1 bg-transparent border-b border-border outline-none"
                    autoFocus
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full px-2 py-1 bg-transparent border-b border-border outline-none text-sm resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded hover:opacity-80"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleComplete({ id: todo._id })}
                    className={`mt-1 w-5 h-5 rounded border-2 flex-shrink-0 transition-colors ${
                      todo.status === "completed"
                        ? "bg-primary border-primary"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    {todo.status === "completed" && (
                      <svg
                        className="w-full h-full text-primary-foreground p-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-base font-mona-medium ${
                          todo.status === "completed"
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {todo.title}
                      </h3>
                      {todo.priority && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                            todo.priority === "high"
                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                              : todo.priority === "medium"
                              ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {todo.priority}
                        </span>
                      )}
                    </div>
                    {todo.description && (
                      <p
                        className={`text-sm mt-1 ${
                          todo.status === "completed"
                            ? "line-through text-muted-foreground/60"
                            : "text-muted-foreground"
                        }`}
                      >
                        {todo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(todo.createdAt).toLocaleDateString()}
                      </span>
                      {todo.completedAt && (
                        <span className="text-xs text-green-600">
                          Completed {new Date(todo.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartEdit(todo)}
                      className="p-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => removeTodo({ id: todo._id })}
                      className="p-1.5 text-muted-foreground hover:text-red-600"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}