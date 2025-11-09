import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Keyboard } from "lucide-react";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: Array<{
    key: string;
    description: string;
    ctrl?: boolean;
    shift?: boolean;
  }>;
}

export function KeyboardShortcutsHelp({ open, onOpenChange, shortcuts }: KeyboardShortcutsHelpProps) {
  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  const formatShortcut = (shortcut: typeof shortcuts[0]) => {
    const parts: string[] = [];
    
    if (shortcut.ctrl) {
      parts.push(isMac ? "⌘" : "Ctrl");
    }
    if (shortcut.shift) {
      parts.push(isMac ? "⇧" : "Shift");
    }
    
    parts.push(shortcut.key.toUpperCase());
    
    return parts.join(isMac ? "" : "+");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate faster
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-4">
          {shortcuts.map((shortcut, index) => (
            <Card key={index}>
              <CardContent className="flex items-center justify-between p-3">
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                <kbd className="pointer-events-none inline-flex h-7 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-sm font-medium text-muted-foreground opacity-100">
                  {formatShortcut(shortcut)}
                </kbd>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
