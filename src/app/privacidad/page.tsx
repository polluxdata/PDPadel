import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Política de Privacidad — PolluxPadel',
  description: 'Cómo PolluxPadel trata tus datos personales (LOPDP, Ecuador).',
};

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-2 mt-6 text-base font-bold text-orange-400">{children}</h2>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-3 text-sm leading-relaxed text-slate-300">{children}</p>
);

const LI = ({ children }: { children: React.ReactNode }) => (
  <li className="text-sm leading-relaxed text-slate-300">
    <span className="mr-2 text-orange-500">•</span>
    {children}
  </li>
);

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-orange-400"
      >
        <ArrowLeft size={16} /> Volver
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">
        Política de Privacidad
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Aplicación PolluxPadel · Última actualización: 7/septiembre/2026
      </p>

      <H2>1. Responsable del tratamiento</H2>
      <P>
        <b>PolluxData Cía. Ltda.</b> (RUC 1792667143001), con domicilio en
        Nayón, Quito, Ecuador, es responsable del tratamiento de los datos
        personales tratados por la aplicación <b>PolluxPadel</b>. Esta política
        describe exclusivamente el tratamiento de la aplicación; el sitio web
        corporativo se rige por su propia{' '}
        <a
          href="https://polluxdata.com/politica-de-privacidad/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-orange-400 underline-offset-2 hover:underline"
        >
          Política de Privacidad
        </a>
        .
      </P>

      <H2>2. Datos personales que tratamos</H2>
      <ul className="mb-3 space-y-2">
        <LI>
          <b>Datos de cuenta:</b> nombre, apellido, apodo y correo electrónico,
          que usted proporciona al registrarse (el correo es su identificador
          de acceso).
        </LI>
        <LI>
          <b>Datos deportivos:</b> su participación en grupos, temporadas y
          quedadas, junto con los resultados de los partidos en los que juega,
          que alimentan marcadores, estadísticas y rankings.
        </LI>
        <LI>
          <b>Datos técnicos y de seguridad:</b> dirección IP (solo para
          limitar el envío abusivo de enlaces), hash del token de sesión
          (mantenido en una cookie propia), enlaces de acceso de un solo uso y
          registros de auditoría de acciones realizadas en la aplicación.
        </LI>
      </ul>
      <P>
        No recopilamos datos de tarjetas de pago, ubicación, contactos ni datos
        sensibles.
      </P>

      <H2>3. Finalidades y bases legales</H2>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2.5 font-medium">Finalidad</th>
              <th className="px-3 py-2.5 font-medium">Base legal (Art. 7 LOPDP)</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800/60">
              <td className="px-3 py-2.5">Crear su cuenta y permitir el acceso mediante enlaces de un solo uso (magic link)</td>
              <td className="px-3 py-2.5">Consentimiento del titular</td>
            </tr>
            <tr className="border-b border-slate-800/60">
              <td className="px-3 py-2.5">Enviar correos transaccionales: enlaces de acceso e invitaciones a grupos</td>
              <td className="px-3 py-2.5">Consentimiento del titular</td>
            </tr>
            <tr className="border-b border-slate-800/60">
              <td className="px-3 py-2.5">Registrar marcadores y calcular rankings y estadísticas de su grupo</td>
              <td className="px-3 py-2.5">Ejecución del servicio solicitado</td>
            </tr>
            <tr>
              <td className="px-3 py-2.5">Proteger la aplicación contra abusos: límites de frecuencia, sesiones revocables y auditoría</td>
              <td className="px-3 py-2.5">Interés legítimo / obligación legal</td>
            </tr>
          </tbody>
        </table>
      </div>

      <H2>4. Encargados del tratamiento y transferencias</H2>
      <P>
        No vendemos ni compartimos sus datos con fines comerciales propios.
        Los proveedores que actúan como encargados son:
      </P>
      <ul className="mb-3 space-y-2">
        <LI>
          <b>Supabase</b> — almacenamiento y gestión de la base de datos de la
          aplicación.
        </LI>
        <LI>
          <b>Vercel Inc.</b> — hosting de la aplicación web.
        </LI>
        <LI>
          <b>Oracle Cloud Infrastructure</b> (OCI Email Delivery) — envío de
          los correos transaccionales (acceso e invitaciones).
        </LI>
      </ul>
      <P>
        Sus datos también pueden ser accesibles para el personal autorizado de
        PolluxData bajo confidencialidad, y para autoridades públicas solo
        ante mandato legal.
      </P>

      <H2>5. Plazo de conservación</H2>
      <ul className="mb-3 space-y-2">
        <LI>
          <b>Enlaces de acceso (magic links):</b> 15 minutos o hasta su uso;
          un solo uso.
        </LI>
        <LI>
          <b>Sesiones:</b> hasta 30 días, revocables al cerrar sesión.
        </LI>
        <LI>
          <b>Límites de frecuencia (IP):</b> ventanas de minutos, luego se
          eliminan.
        </LI>
        <LI>
          <b>Cuenta y datos deportivos:</b> mientras exista su cuenta. Si
          desea eliminarla, escriba a <a href="mailto:privacidad@polluxdata.com" className="font-semibold text-orange-400 hover:underline">privacidad@polluxdata.com</a>.
        </LI>
        <LI>
          <b>Registros de auditoría:</b> se conservan con fines de seguridad e
          integridad del servicio.
        </LI>
      </ul>

      <H2>6. Medidas de seguridad</H2>
      <ul className="mb-3 space-y-2">
        <LI>Comunicaciones cifradas con HTTPS (TLS).</LI>
        <LI>
          Tokens de sesión guardados únicamente como <b>hash</b> (nunca en
          texto claro) y en cookie <i>httpOnly</i>.
        </LI>
        <LI>
          Claves de servicio confinadas al servidor; el acceso a datos pasa
          por API con validación de sesión y roles por grupo.
        </LI>
        <LI>Límites de frecuencia en el envío de enlaces e invitaciones.</LI>
      </ul>

      <H2>7. Sus derechos como titular</H2>
      <P>
        Conforme a los artículos 16 al 24 de la Ley Orgánica de Protección de
        Datos Personales (LOPDP) del Ecuador, usted puede ejercer los derechos
        de <b>acceso, rectificación, eliminación, oposición, portabilidad y
        revocación del consentimiento</b>, escribiendo a{' '}
        <a href="mailto:privacidad@polluxdata.com" className="font-semibold text-orange-400 hover:underline">privacidad@polluxdata.com</a>.
        Respondemos en un plazo máximo de 15 días hábiles, prorrogable por 10
        días hábiles adicionales en casos complejos.
      </P>
      <P>
        Si considera que su solicitud no fue atendida adecuadamente, puede
        presentar un reclamo ante la{' '}
        <b>Superintendencia de Protección de Datos Personales</b> (
        <a href="https://www.spdp.gob.ec" target="_blank" rel="noopener noreferrer" className="font-semibold text-orange-400 hover:underline">spdp.gob.ec</a>
        ).
      </P>

      <H2>8. Menores de edad</H2>
      <P>
        La aplicación no está dirigida a menores de edad. Si un grupo
        deportivo incluye a un menor, el administrador del grupo es
        responsable de contar con la autorización de sus padres o tutores
        antes de incorporarlo.
      </P>

      <H2>9. Cambios de esta política</H2>
      <P>
        Podemos actualizar esta política para reflejar cambios normativos o del
        servicio. La fecha de la última actualización aparece al inicio del
        documento.
      </P>

      <H2>10. Contacto</H2>
      <ul className="mb-6 space-y-2">
        <LI>Correo: privacidad@polluxdata.com</LI>
        <LI>Dirección: Nayón, Quito, Ecuador</LI>
        <LI>
          Política corporativa:{' '}
          <a
            href="https://polluxdata.com/politica-de-privacidad/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-orange-400 hover:underline"
          >
            polluxdata.com/politica-de-privacidad
          </a>
        </LI>
      </ul>
    </main>
  );
}
