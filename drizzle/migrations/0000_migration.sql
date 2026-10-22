create table public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  category text not null check (category in ('image','document','video','audio')),
  title text not null default '',
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  sha256 text not null,
  storage_path text not null,
  reference_name text,
  reference_sha256 text,
  reference_path text,
  findings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.cases to authenticated;
grant all on public.cases to service_role;
alter table public.cases enable row level security;
create policy "own cases select" on public.cases for select to authenticated using (auth.uid() = user_id);
create policy "own cases insert" on public.cases for insert to authenticated with check (auth.uid() = user_id);
create policy "own cases update" on public.cases for update to authenticated using (auth.uid() = user_id);
create policy "own cases delete" on public.cases for delete to authenticated using (auth.uid() = user_id);

create table public.audit_events (
  id bigint generated always as identity primary key,
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  event text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_events to authenticated;
grant all on public.audit_events to service_role;
alter table public.audit_events enable row level security;
create policy "own audit select" on public.audit_events for select to authenticated using (auth.uid() = user_id);
create policy "own audit insert" on public.audit_events for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.cases c where c.id = case_id and c.user_id = auth.uid()));

create policy "evidence own read" on storage.objects for select to authenticated using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "evidence own write" on storage.objects for insert to authenticated with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "evidence own delete" on storage.objects for delete to authenticated using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);