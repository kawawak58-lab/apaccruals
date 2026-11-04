export const isAccrualAdmin = (user) => ['sysadmin', 'accrual_admin'].includes(user?.usergroup);
export const canViewArchives = (user) => user?.usergroup === 'sysadmin';
export const canManageAccrualSetup = (user) => user?.usergroup === 'sysadmin' || (user?.usergroup !== 'accrual_admin' && Boolean(user?.can_update_setup));
