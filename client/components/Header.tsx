import { Search, Menu, Bell, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  onMenuClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function Header({ onMenuClick, searchQuery = "", onSearchChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-[#0f0f0f] border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-4 px-4 h-14">
        {/* Left: Menu + Logo */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/>
              </svg>
            </div>
            <span className="text-xl font-semibold text-foreground hidden sm:block">
              VideoHub
            </span>
          </Link>
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-2xl mx-4">
          <form 
            className="flex items-center gap-0"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full h-10 pr-4 pl-4 rounded-l-full rounded-r-none border-r-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-500 dark:bg-[#121212] dark:border-gray-700"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              className="h-10 px-6 rounded-r-full rounded-l-none border-l-0 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-[#222222] dark:border-gray-700"
            >
              <Search className="h-5 w-5" />
            </Button>
          </form>
        </div>

        {/* Right: Icons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full hidden sm:flex"
          >
            <Bell className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full bg-blue-500 text-white hover:bg-blue-600"
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
