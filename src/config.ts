export const config = {
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  googleScopes: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/drive',  // Full drive access needed to copy existing files
  ].join(' '),
}
