import type { User } from '@supabase/supabase-js';

import { accountFromUser, displayName } from '../account';

const user = (overrides: Partial<User>): User =>
  ({
    id: 'u1',
    aud: 'authenticated',
    created_at: '',
    app_metadata: {},
    user_metadata: {},
    ...overrides,
  }) as User;

describe('accountFromUser', () => {
  it('maps provider and name from metadata', () => {
    expect(
      accountFromUser(
        user({ email: 'a@b.co', app_metadata: { provider: 'apple' }, user_metadata: { full_name: ' Ada ' } }),
      ),
    ).toEqual({ id: 'u1', email: 'a@b.co', name: 'Ada', provider: 'apple' });
  });

  it('treats unknown providers as email', () => {
    expect(accountFromUser(user({ app_metadata: { provider: 'email' } })).provider).toBe('email');
    expect(accountFromUser(user({ app_metadata: { provider: 'github' } })).provider).toBe('email');
  });
});

describe('displayName', () => {
  it('prefers the name, then the email local part', () => {
    expect(displayName({ id: '1', email: 'reader@x.io', name: 'Ada', provider: 'email' })).toBe('Ada');
    expect(displayName({ id: '1', email: 'reader@x.io', name: null, provider: 'email' })).toBe('reader');
    expect(displayName({ id: '1', email: null, name: null, provider: 'apple' })).toBe('Reader');
  });
});
