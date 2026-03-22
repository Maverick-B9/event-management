import { Navigate } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import type { UserRole } from "../../hooks/useAuth";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRole: UserRole;
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
    const { user, userProfile, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-transparent flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user || !userProfile) {
        return <Navigate to="/login" replace />;
    }

    if (userProfile.role !== allowedRole) {
        return <Navigate to={`/${userProfile.role}`} replace />;
    }

    return <>{children}</>;
}
