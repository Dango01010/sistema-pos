import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Edit, Trash2, Shield, ShoppingCart, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination.jsx";
import { useAuth } from '@/contexts/AuthContext';

function UserManagement() {
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isOwnPasswordOpen, setIsOwnPasswordOpen] = useState(false);
    const [resetTarget, setResetTarget] = useState(null);
    const [newUser, setNewUser] = useState({ username: '', name: '', password: '', role: 'vendedor' });
    const [ownPasswordForm, setOwnPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [resetPassword, setResetPassword] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const ITEMS_PER_PAGE = 15;
    const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
    const paginatedUsers = users.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = () => {
        fetch('/api/users')
            .then(res => {
                if (!res.ok) throw new Error("Error en red");
                return res.json();
            })
            .then(data => {
                setUsers(data);
                setLoading(false);
            })
            .catch(err => console.error(err));
    };

    const handleCreateUser = async () => {
        if (!newUser.username || !newUser.password || !newUser.name) {
            toast({ title: "Error", description: "Complete todos los campos", variant: "destructive" });
            return;
        }
        if (newUser.password.length < 6) {
            toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" });
            return;
        }
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            if (!res.ok) {
                let errDesc = "No se pudo crear el usuario";
                try { const errRes = await res.json(); errDesc = errRes.error || errDesc; } catch (e) {}
                throw new Error(errDesc);
            }
            toast({ title: "Usuario Creado", description: newUser.name });
            fetchUsers();
            setIsAddOpen(false);
            setNewUser({ username: '', name: '', password: '', role: 'vendedor' });
        } catch (error) {
            toast({ title: "Error", description: error.message || "No se pudo crear el usuario", variant: "destructive" });
        }
    };

    const handleDelete = async (id) => {
        if (id === currentUser?.id) {
            toast({ title: "No permitido", description: "No puedes eliminar tu propio usuario", variant: "destructive" });
            return;
        }
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                toast({ title: "Usuario Eliminado" });
                setUsers(users.filter(u => u.id !== id));
            } else {
                toast({ title: "Error", description: data.error || "No se pudo eliminar el usuario", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleResetPassword = async () => {
        if (!resetTarget) return;
        if (resetPassword.length < 6) {
            toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" });
            return;
        }
        try {
            const res = await fetch(`/api/users/${resetTarget.id}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: resetPassword })
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                toast({ title: "Contraseña actualizada", description: `Nueva contraseña asignada a ${resetTarget.name}` });
                setResetTarget(null);
                setResetPassword('');
            } else {
                toast({ title: "Error", description: data.error || "No se pudo cambiar la contraseña", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "No se pudo cambiar la contraseña", variant: "destructive" });
        }
    };

    const handleChangeOwnPassword = async () => {
        if (!ownPasswordForm.current_password || !ownPasswordForm.new_password) {
            toast({ title: "Error", description: "Complete todos los campos", variant: "destructive" });
            return;
        }
        if (ownPasswordForm.new_password.length < 6) {
            toast({ title: "Error", description: "La nueva contraseña debe tener al menos 6 caracteres", variant: "destructive" });
            return;
        }
        if (ownPasswordForm.new_password !== ownPasswordForm.confirm_password) {
            toast({ title: "Error", description: "Las contraseñas nuevas no coinciden", variant: "destructive" });
            return;
        }
        try {
            const res = await fetch('/api/users/me/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    current_password: ownPasswordForm.current_password,
                    new_password: ownPasswordForm.new_password
                })
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                toast({ title: "Contraseña cambiada", description: "Tu contraseña fue actualizada correctamente" });
                setIsOwnPasswordOpen(false);
                setOwnPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
            } else {
                toast({ title: "Error", description: data.error || "No se pudo cambiar la contraseña", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "No se pudo cambiar la contraseña", variant: "destructive" });
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'admin':
                return <Shield className="w-4 h-4" />;
            case 'vendedor':
                return <ShoppingCart className="w-4 h-4" />;
            default:
                return null;
        }
    };

    if (loading) {
        return <div className="text-slate-400">Cargando usuarios...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h2>
                <div className="flex gap-2">
                    <Dialog open={isOwnPasswordOpen} onOpenChange={setIsOwnPasswordOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-border text-foreground hover:bg-accent">
                                <KeyRound className="w-4 h-4 mr-2" />
                                Cambiar mi contraseña
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border text-foreground">
                            <DialogHeader>
                                <DialogTitle>Cambiar mi contraseña</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Contraseña actual</Label>
                                    <Input type="password" value={ownPasswordForm.current_password} onChange={e => setOwnPasswordForm({ ...ownPasswordForm, current_password: e.target.value })} className="bg-background border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nueva contraseña</Label>
                                    <Input type="password" value={ownPasswordForm.new_password} onChange={e => setOwnPasswordForm({ ...ownPasswordForm, new_password: e.target.value })} className="bg-background border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Confirmar nueva contraseña</Label>
                                    <Input type="password" value={ownPasswordForm.confirm_password} onChange={e => setOwnPasswordForm({ ...ownPasswordForm, confirm_password: e.target.value })} className="bg-background border-border text-foreground" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsOwnPasswordOpen(false)}>Cancelar</Button>
                                <Button onClick={handleChangeOwnPassword}>Guardar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">
                                <UserPlus className="w-4 h-4 mr-2" />
                                Agregar Usuario
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border text-foreground">
                            <DialogHeader>
                                <DialogTitle>Agregar Nuevo Usuario</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Nombre Completo</Label>
                                    <Input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="bg-background border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nombre de Usuario</Label>
                                    <Input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} className="bg-background border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Contraseña</Label>
                                    <Input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="bg-background border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Rol</Label>
                                    <Select value={newUser.role} onValueChange={v => setNewUser({ ...newUser, role: v })}>
                                        <SelectTrigger className="bg-background border-border text-foreground">
                                            <SelectValue placeholder="Seleccionar rol" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">Administrador</SelectItem>
                                            <SelectItem value="vendedor">Vendedor</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                                <Button onClick={handleCreateUser}>Crear</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) { setResetTarget(null); setResetPassword(''); } }}>
                <DialogContent className="bg-card border-border text-foreground">
                    <DialogHeader>
                        <DialogTitle>Restablecer contraseña</DialogTitle>
                    </DialogHeader>
                    {resetTarget && (
                        <div className="space-y-4 py-4">
                            <p className="text-muted-foreground text-sm">
                                Asignar una nueva contraseña para <span className="text-foreground font-medium">{resetTarget.name}</span> ({resetTarget.username})
                            </p>
                            <div className="space-y-2">
                                <Label>Nueva contraseña</Label>
                                <Input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="bg-background border-border text-foreground" />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setResetTarget(null); setResetPassword(''); }}>Cancelar</Button>
                        <Button onClick={handleResetPassword}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="glass-card rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="text-left py-4 px-6 text-foreground font-semibold">Usuario</th>
                                <th className="text-left py-4 px-6 text-foreground font-semibold">Username</th>
                                <th className="text-left py-4 px-6 text-foreground font-semibold">Rol</th>
                                <th className="text-left py-4 px-6 text-foreground font-semibold">Estado</th>
                                <th className="text-right py-4 px-6 text-foreground font-semibold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUsers.map((user, index) => (
                                <motion.tr
                                    key={user.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="border-t border-border hover:bg-accent/50 transition-colors"
                                >
                                    <td className="py-4 px-6 text-foreground font-medium">{user.name}</td>
                                    <td className="py-4 px-6 text-muted-foreground">{user.username}</td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
                                            {getRoleIcon(user.role)}
                                            <span className="capitalize">{user.role}</span>
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-500/20 text-green-400">
                                            Activo
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setResetTarget(user)}
                                                className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                                                title="Restablecer contraseña"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                disabled={user.id === currentUser?.id}
                                                className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                title={user.id === currentUser?.id ? 'No puedes eliminar tu propio usuario' : 'Eliminar usuario'}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination 
                    currentPage={currentPage} 
                    totalPages={totalPages} 
                    onPageChange={setCurrentPage} 
                />
            </div>
        </div>
    );
}

export default UserManagement;
