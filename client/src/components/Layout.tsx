// src/components/Layout.tsx
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from './useUser';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

// use icons for login and sign up

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, handleSignOut } = useUser();
  const isAuthPage =
    location.pathname === '/login' || location.pathname === '/signup';

  const handleLogout = () => {
    handleSignOut();
    navigate('/login');
  };
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Bar */}
      <nav className=" text-black shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={user ? '/dashboard' : '/'} className="font-bold text-xl">
              <img
                src="/FinSight.png"
                alt="FinSight"
                className="h-20 w-auto mb-1"
              />
            </Link>

            {/* Avatar */}
            {user && (
              <div className="flex items-center">
                <Avatar>
                  <AvatarImage
                    src="https://github.com/shadcn.png"
                    alt="@shadcn"
                  />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <span className="ml-2">{user?.userName}</span>
                
                {/* Logout */}
                <Button onClick={handleLogout} className="ml-10">
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="flex-1">
        {isAuthPage ? (
          <div className="max-w-md mx-auto mt-10 px-4">
            <Outlet />
          </div>
        ) : (
          <div className="container mx-auto px-4 py-6">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
}
