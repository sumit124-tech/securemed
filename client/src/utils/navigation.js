/**
 * Resolves the appropriate dashboard path based on the user's role.
 * 
 * @param {string|null|undefined} role - The user's role (ADMIN, DOCTOR, PATIENT)
 * @returns {string} The dashboard route path or fallback route
 */
export const getDashboardPath = (role) => {
  switch (role) {
    case 'ADMIN':
      return '/admin-dashboard';
    case 'DOCTOR':
      return '/doctor-dashboard';
    case 'PATIENT':
      return '/patient-dashboard';
    default:
      return '/login';
  }
};
