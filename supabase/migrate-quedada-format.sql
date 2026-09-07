-- Migración: formato de quedada (Americano | Mexicano)
-- Ejecutar en el SQL editor de Supabase para bases de datos ya creadas
-- (schema.sql solo crea la tabla si no existe).

alter table public.quedadas
  add column if not exists format text not null default 'americano';

-- El CHECK solo se agrega si la columna es nueva; en tablas existentes con
-- datos el default 'americano' es válido para todas las filas.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'quedadas_format_check'
  ) then
    alter table public.quedadas
      add constraint quedadas_format_check check (format in ('americano','mexicano'));
  end if;
end $$;
