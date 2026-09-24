import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { obtenerSesionServidor } from '@/lib/auth/sesion';
import FormularioLogin from '@/components/panel/FormularioLogin';

export const metadata: Metadata = {
  title: 'Iniciar Sesión | Panel Dolce Florencia',
};

export default async function LoginPage() {
  const sesion = await obtenerSesionServidor();
  if (sesion) {
    redirect('/panel');
  }

  return (
    <div className="panel-login-wrap">
      <main className="wrap panel-login-contenido">
        <FormularioLogin />
      </main>
    </div>
  );
}
