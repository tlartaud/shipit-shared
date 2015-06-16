# shipit-shared

A set of tasks for [Shipit](https://github.com/shipitjs/shipit) used for symlinking persistent (un-sourced) files and directories on deploy.

Based on the concept of `linked_files`/`linked_dirs` from [Capistrano](http://capistranorb.com/documentation/getting-started/configuration/)

**Features:**

- Triggered on the `published` event from [shipit-deploy](https://github.com/shipitjs/shipit-deploy)
- All neccesary directories are always created for you, whether you are linking a file or a directory.
- Works via [shipit-cli](https://github.com/shipitjs/shipit) and [grunt-shipit](https://github.com/shipitjs/grunt-shipit)
- Optionally ignore specified tables

**Roadmap**

- Optionally copy example files, such as example config files

## Install

```
npm install shipit-shared
```

## Usage

### Example `shipitfile.js`

```js
module.exports = function (shipit) {
  require('shipit-deploy')(shipit);
  require('shipit-shared')(shipit);

  shipit.initConfig({
    default: {
      shared: {
        dirs: [
          'public/storage',
          'db',
        ],
        files: [
          'config/environment.yml',
          'config/database.yml',
        ],
      }
    }
  });
};
```

To trigger on the deploy `published` event, you can simply deploy:

```
shipit staging deploy
```

Or you can run the tasks separatly :

```
shipit staging shared
    shipit staging shared:create-dirs
    shipit staging shared:link
        shipit staging shared:link:dirs
        shipit staging shared:link:files
```

## Options `shipit.config.shared`

### `shared.dirs`

Type: `Array`

An array of directories to symlink to `current`.

### `shared.files`

Type: `Array`

An array of files to symlink to `current`.

### `shared.path`

Type: `String`
Default: `path.join(shipit.config.deployTo, 'shared')`

The path where your shared files reside.

#### `shared.path` modes

> Optional: Use a preset mode to tell shipit-shared what to do why the shared files

Syntax: ` --mode=[MODE]`

Modes:
- default
  This is the default mode. It will be used if you do not provide any `mode=` option, or if the one provided
  can not be found. This mode is safe, it will try to move the newly pulled target file/directory to you
  shared folder, but if something already exists in that place, it will be mode to the backups folder instead.
- override
  Use this mode when you have a file/directory stored in your repository and rsynced to your remote
  by shipit, and when you want this file/directory to be copied to your shared folder, and to
  override the actual one in your `shared` folder.
- ignore
  Use this mode when you have a file/directory stored in your repository and rsynced to your remote
  by shipit, and when you dont want this file/directory to be copied to your shared folder. It will be
  copied to backups or removed.
  
  
Example:
```
"shared": {
    "dirs": [
      "html/app/uploads",
      "html/app/cache --mode=override"
    ],
    "files": [
      ".env",
      "html/.htaccess --mode=override",
      "html/app/advanced-cache.php --mode=ignore"
    ]
  }
```

### `shared.symlinkPath`

Type: `String`
Default: `shared.path`

The path that will serve as the source for your symlink. This is usually the same as `shared.path`, however it can [necessary to set this in a `chroot` environment](https://github.com/timkelty/shipit-shared/issues/7).

## License

MIT
