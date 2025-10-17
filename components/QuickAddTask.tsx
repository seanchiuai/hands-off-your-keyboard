"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";

export function QuickAddTask() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const createTodo = useMutation(api.todos.create);

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };

    const handleOpenEvent = () => setOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-quick-add-task", handleOpenEvent as EventListener);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-quick-add-task", handleOpenEvent as EventListener);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await createTodo({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      });

      toast.success("Task created!");
      setTitle("");
      setDescription("");
      setPriority("medium");
      setOpen(false);
    } catch (error) {
      console.error("Failed to create task:", error);
      toast.error("Failed to create task");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2 gradient-primary hover-lift glow-hover transition-smooth shadow-lg shadow-primary/30 spring-button">
          <IconPlus className="h-4 w-4" />
          <span className="hidden sm:inline font-medium">Add Task</span>
          <kbd className="hidden lg:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border border-white/20 bg-white/10 px-1.5 font-mono text-[10px] font-medium">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to your list. Press ⌘K anytime to open this dialog.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={priority === "low" ? "default" : "outline"}
                size="sm"
                onClick={() => setPriority("low")}
                className="flex-1"
              >
                Low
              </Button>
              <Button
                type="button"
                variant={priority === "medium" ? "default" : "outline"}
                size="sm"
                onClick={() => setPriority("medium")}
                className="flex-1"
              >
                Medium
              </Button>
              <Button
                type="button"
                variant={priority === "high" ? "default" : "outline"}
                size="sm"
                onClick={() => setPriority("high")}
                className="flex-1"
              >
                High
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="spring-button">Create Task</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
