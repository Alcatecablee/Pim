import { Home, Clock, ThumbsUp, Folder, ChevronRight } from "lucide-react";
import { VideoFolder } from "@shared/api";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SidebarProps {
  isOpen: boolean;
  folders: VideoFolder[];
  selectedFolder: string;
  onFolderSelect: (folderId: string) => void;
  onClose?: () => void;
}

export function Sidebar({ isOpen, folders, selectedFolder, onFolderSelect, onClose }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    folders: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-14 h-[calc(100vh-3.5rem)] bg-white dark:bg-[#0f0f0f] border-r border-gray-200 dark:border-gray-800 z-40 transition-transform duration-300 overflow-y-auto",
          isOpen ? "translate-x-0 w-60" : "-translate-x-full lg:translate-x-0 lg:w-[72px]"
        )}
      >
        <div className="py-3">
          {/* Main Navigation */}
          <nav className="space-y-1 px-3 mb-4">
            <button
              onClick={() => onFolderSelect("all")}
              className={cn(
                "w-full flex items-center gap-6 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                selectedFolder === "all"
                  ? "bg-gray-100 dark:bg-gray-800 text-foreground"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Home className="w-5 h-5 flex-shrink-0" />
              {isOpen && <span>Home</span>}
            </button>
            
            <button
              className={cn(
                "w-full flex items-center gap-6 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Clock className="w-5 h-5 flex-shrink-0" />
              {isOpen && <span>History</span>}
            </button>
            
            <button
              className={cn(
                "w-full flex items-center gap-6 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <ThumbsUp className="w-5 h-5 flex-shrink-0" />
              {isOpen && <span>Liked videos</span>}
            </button>
          </nav>

          {/* Folders Section */}
          {folders.length > 0 && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-800 my-3" />
              
              <div className="px-3">
                {isOpen && (
                  <button
                    onClick={() => toggleSection('folders')}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg mb-1"
                  >
                    <span>Collections</span>
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 transition-transform",
                        expandedSections.folders && "rotate-90"
                      )}
                    />
                  </button>
                )}
                
                {(expandedSections.folders || !isOpen) && (
                  <nav className="space-y-1">
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => onFolderSelect(folder.id)}
                        className={cn(
                          "w-full flex items-center gap-6 px-3 py-2 rounded-lg text-sm transition-colors",
                          selectedFolder === folder.id
                            ? "bg-gray-100 dark:bg-gray-800 text-foreground font-medium"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                        title={!isOpen ? folder.name : undefined}
                      >
                        <Folder className="w-5 h-5 flex-shrink-0" />
                        {isOpen && (
                          <span className="truncate flex-1 text-left">
                            {folder.name}
                          </span>
                        )}
                        {isOpen && folder.video_count !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {folder.video_count}
                          </span>
                        )}
                      </button>
                    ))}
                  </nav>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
