import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';

function ChangePasswordDialog({ triggerClassName = '' }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

    const resetForm = () => {
        setForm({ current_password: '', new_password: '', confirm_password: '' });
    };

    const handleSubmit = async () => {
        if (!form.current_password || !form.new_password) {
            toast({ title: 'Error', description: 'Complete todos los campos', variant: 'destructive' });
            return;
        }
        if (form.new_password.length < 6) {
            toast({ title: 'Error', description: 'La nueva contraseña debe tener al menos 6 caracteres', variant: 'destructive' });
            return;
        }
        if (form.new_password !== form.confirm_password) {
            toast({ title: 'Error', description: 'Las contraseñas nuevas no coinciden', variant: 'destructive' });
            return;
        }
        try {
            const res = await fetch('/api/users/me/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    current_password: form.current_password,
                    new_password: form.new_password
                })
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                toast({ title: 'Contraseña cambiada', description: 'Tu contraseña fue actualizada correctamente' });
                setOpen(false);
                resetForm();
            } else {
                toast({ title: 'Error', description: data.error || 'No se pudo cambiar la contraseña', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'No se pudo cambiar la contraseña', variant: 'destructive' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className={triggerClassName || 'text-muted-foreground hover:text-foreground'}>
                    <KeyRound className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground">
                <DialogHeader>
                    <DialogTitle>Cambiar mi contraseña</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Contraseña actual</Label>
                        <Input type="password" value={form.current_password} onChange={e => setForm({ ...form, current_password: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Nueva contraseña</Label>
                        <Input type="password" value={form.new_password} onChange={e => setForm({ ...form, new_password: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Confirmar nueva contraseña</Label>
                        <Input type="password" value={form.confirm_password} onChange={e => setForm({ ...form, confirm_password: e.target.value })} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => { setOpen(false); resetForm(); }}>Cancelar</Button>
                    <Button onClick={handleSubmit}>Guardar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default ChangePasswordDialog;
