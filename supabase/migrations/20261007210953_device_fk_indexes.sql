-- Cover the (device_id, user_id) foreign keys used when a device is removed.
create index progress_device on public.progress (device_id, user_id);
create index activity_days_device on public.activity_days (device_id, user_id);
