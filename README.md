# Getting Started with Create React App

## Filing setups and archives

Before deploying this version, run `migrations/20261104_filing_setups_archives.sql`
in the Supabase SQL Editor after the existing schema and the October 29/30 workflow
migrations. Then run `migrations/20261104_filing_setup_edit.sql` to enable setup
editing and inactive creation. If the archive migration was already applied,
run only this follow-up file. Then run `migrations/20261104_filing_setup_delete.sql`
for setup deletion. The app expects these new policies and RPCs.
Finally run `migrations/20261104_filing_setup_lock_restore.sql` for locking and
archive restoration. If earlier migrations are already installed, run only the
new migration. Do not reapply older RPC definitions afterward.
Run `migrations/20261104_archives_sysadmin_only.sql` last to restrict archive
viewing to sysadmins, including direct database reads through the API.

- Existing accruals are retained and linked to one **Imported filing window** using
  the current legacy setup dates. Older filing periods cannot be inferred reliably
  from the existing data. No existing records are automatically archived.
- Each new filing setup receives a UUID and starts inactive. Use **Add setup** to
  open the filing-window dialog, or double-click a setup row to edit its name and dates.
  Editing preserves its ID and activation state. **Activate** deactivates the
  previous setup atomically. Deactivating the last active setup closes filing.
  Dates are inclusive and evaluated in Asia/Shanghai. A partial unique index and
  transaction locks enforce at most one active setup, including concurrent requests.
- Submissions and uploads are assigned to the active setup on the server. If a
  client's setup changed, submission fails and the user must refresh before retrying.
- Double-click a setup to open its dialog. **Lock** deactivates it, closes
  filing, and makes its settings and accruals read only. Delete is hidden while
  locked. Locking discards unsaved setup edits.
- Archive a locked setup from its dialog after reviewing confirmation.
  Its submissions receive `is_archived = true` and archive audit timestamps. Their
  original lines, notes, statuses, and control numbers remain in place. Archived
  submissions, lines, and notes are read only.
- To restore an archive, double-click it, choose **Unlock**, then **Unarchive**
  and confirm. Unlocking alone keeps the records archived and read only.
  Unarchiving returns the same records to All Accruals without changing their
  statuses, control numbers, or setup links. The restored setup remains inactive
  until explicitly activated. Lock, unlock, archive and unarchive timestamps and
  actors are retained. Existing archives start locked when the migration is applied.
- **Delete** sits beside Activate/Deactivate and permanently removes an empty setup
  after confirmation. Setups with any linked accruals cannot be deleted; archive
  those setups instead. Deleting an empty active setup closes the filing window.
- **Archive List** reuses the accrual list and details UI, including export, with
  a setup selector. All Accruals excludes archived records.
- **Archive List** and archived records are available only to `sysadmin`.
- `accrual_admin` can manage nonarchived accruals and master data. It
  cannot manage users, filing setups, announcements, or control-number settings,
  even if legacy permission flags are set. Sysadmins retain administration access;
  existing delegated setup editors retain setup access. Ordinary users see their
  own nonarchived accruals. Database RLS and RPC checks enforce these restrictions.

Validation: run `npm test -- --watchAll=false --runInBand` and `npm run build`.
For database checks, run `migrations/tests/filing_setups_smoke.sql` in staging after
the migration; it rolls back its fixtures and active-window changes. Also verify
two concurrent activation requests in separate SQL sessions leave only one active
row. The migration and database smoke script are not automatically applied by the
frontend build.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
