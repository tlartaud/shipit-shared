var utils = require('shipit-utils');
var sprintf = require('sprintf-js').sprintf;
var path = require('path2/posix');
var chalk = require('chalk');
var Bluebird = require('bluebird');
var init = require('../../lib/init');
var exec = require('exec');

/**
 * Create shared symlinks.
 */

module.exports = function (gruntOrShipit) {
    utils.registerTask(gruntOrShipit, 'shared:link:dirs', linkDirs);
    utils.registerTask(gruntOrShipit, 'shared:link:files', linkFiles);
    utils.registerTask(gruntOrShipit, 'shared:link', [
        'shared:link:dirs',
        'shared:link:files'
    ]);

    function link(filePath) {
        var shipit = utils.getShipit(gruntOrShipit);
        shipit = init(shipit);

        /*
         * Optional Feature : `--mode=`
         * ----------------------------
         *
         * Simply add an available mode in your paths, eg.
         * "shared": {
         *      "dirs": [
         *          "html/app/uploads",
         *          "html/app/cache"
         *      ],
         *      "files": [
         *          ".env",
         *          "html/.htaccess --mode=override",
         *          "html/app/advanced-cache.php"
         *      ]
         * }
         *
         * --mode=default
         * --------------
         *
         * Defined below as `var = linkAction;`
         *
         * Steps :
         * - Make sure backup folder exists
         * - If source file/directory exists, keep it in place, and move/backup newly pulled target file/directory
         *   from release directory to backups folder, else move it to shared folder
         *
         * Case :
         * This is the default mode. It will be used if you do not provide any `mode=` option, or if the one provided
         * can not be found. This mode is safe, it will try to move the newly pulled target file/directory to you
         * shared folder, but if something already exists in that place, it will be mode to the backups folder instead.
         *
         * Notice :
         * You can note that this mode use `rm -r`. Don't be afraid, it will only remove your target
         * file/directory pulled from your repository, and this will happen only if the target is not a file
         * or a directory, otherwise it will be moved to your shared folder.
         *
         */
        var switcher,
            linkRegex = shipit.config.shared.regex.mode,
            linkPath = filePath.replace(linkRegex, ''),
            linkSource = path.join(shipit.sharedSymlinkPath, linkPath),
            linkShared = path.join(shipit.sharedPath, linkPath),
            linkTarget = path.join(shipit.releasesPath, shipit.releaseDirname, linkPath),
            linkBackup = path.join(shipit.sharedPath, 'backups', 'shipit-shared', shipit.releaseDirname),
            linkAction = 'mkdir -p "' + linkBackup + '";'
                + ' if [ -e "' + linkShared + '" ]; then mv "' + linkTarget + '" "' + linkBackup + '"; else if [ -d "' + linkTarget + '" ]; then mv "' + linkTarget + '/*" "' + linkShared + '"; mv "' + linkTarget + '/.*" "' + linkShared + '"; elif [ -f "' + linkTarget + '" ]; then mv "' + linkTarget + '" "' + linkShared + '"; else rm -r "' + linkTarget + '" 2> /dev/null; fi; fi;';

        while ((switcher = linkRegex.exec(filePath)) !== null) {
            switch (switcher[2]) {
                /*
                 * --mode=override
                 * ---------------
                 *
                 * Steps :
                 * - Make sure backup folder exists
                 * - If target file/directory exists, move/backup actual source file/directory from `/shared` to `backups/`
                 * - Move target file/directory to source or remove it if its something else than a file/directory
                 *
                 * Case :
                 * Use this mode when you have a file/directory stored in your repository and rsynced to your remote
                 * by shipit, and when you want this file/directory to be copied to your shared folder, and to
                 * override the actual one in your `shared` folder.
                 *
                 * Caution :
                 * When using this mode, do not add your file to `shipit.ignores` or the file won't exist on your
                 * remote after shipit Rsync Copying, so moving the file will not be possible. In this case, backups
                 * and moving processes will be skipped, and the actual corresponding file/directory in `shared/`
                 * will be keep in place.
                 *
                 * Notice :
                 * You can note that this mode use `rm -r`. Don't be afraid, it will only remove your target
                 * file/directory pulled from your repository, and this will happen only if the target is not a file
                 * or a directory, otherwise it will be moved to your shared folder.
                 *
                 */
                case 'override':
                    linkAction = 'mkdir -p "' + linkBackup + '";'
                    + ' if [ -e "' + linkTarget + '" ]; then if [ -d "' + linkTarget + '" ]; then mv "' + linkShared + '/*" "' + linkBackup + '"; mv "' + linkShared + '/.*" "' + linkBackup + '"; elif [ -f "' + linkTarget + '" ]; then mv "' + linkShared + '" "' + linkBackup + '"; fi; fi;'
                    + ' if [ -d "' + linkTarget + '" ]; then mv "' + linkTarget + '/*" "' + linkShared + '"; mv "' + linkTarget + '/.*" "' + linkShared + '"; elif [ -f "' + linkTarget + '" ]; then mv "' + linkTarget + '" "' + linkShared + '"; else rm -r "' + linkTarget + '" 2> /dev/null; fi;';
                    break;

                /*
                 * --mode=ignore
                 * ---------------
                 *
                 * Steps :
                 * - Make sure backup folder exists
                 * - If target file/directory exists, move it from releases directory to `backups/`
                 *
                 * Case :
                 * Use this mode when you have a file/directory stored in your repository and rsynced to your remote
                 * by shipit, and when you dont want this file/directory to be copied to your shared folder. It will be
                 * copied to backups or removed.
                 *
                 * Notice :
                 * You can note that this mode use `rm -r`. Don't be afraid, it will only remove your target
                 * file/directory pulled from your repository, and this will happen only if the target is not a file
                 * or a directory, otherwise it will be moved to your shared folder.
                 *
                 */
                case 'ignore':
                    linkAction = 'mkdir -p "' + linkBackup + '";'
                    + ' if [ -d "' + linkTarget + '" ]; then mv "' + linkTarget + '/*" "' + path.join(linkBackup, linkPath) + '"; mv "' + linkTarget + '/.*" "' + path.join(linkBackup, linkPath) + '"; elif [ -f "' + linkTarget + '" ]; then mv "' + linkTarget + '" "' + path.join(linkBackup, linkPath) + '"; else rm -r "' + linkTarget + '" 2> /dev/null; fi;';
                    break;
            }
        }


        return shipit.remote(
            sprintf('if ( ! [ -h "%(target)s" ] ) || ( [ -h "%(target)s" ] && [ "`readlink %(target)s`" != "%(source)s" ] ); then %(action)s ln -s "%(source)s" "%(target)s"; fi', {
                source: linkSource,
                target: linkTarget,
                action: linkAction
            })
        );
    }

    function linkDirs() {
        var shipit = utils.getShipit(gruntOrShipit);
        shipit = init(shipit);
        if (!shipit.config.shared.dirs.length) {
            return Bluebird.resolve();
        }

        var promises = shipit.config.shared.dirs.map(function (path) {
            link(path);
        });

        return new Bluebird.all(promises)
            .then(function () {
                shipit.log(chalk.green('Shared directories symlinked on remote.'));
            })
            .then(function () {
                shipit.emit('shared:link:dirs')
            });
    }

    function linkFiles() {
        var shipit = utils.getShipit(gruntOrShipit);
        shipit = init(shipit);

        if (!shipit.config.shared.files.length) {
            return Bluebird.resolve();
        }

        var promises = shipit.config.shared.files.map(function (path) {
            link(path);
        });

        return new Bluebird.all(promises)
            .then(function () {
                shipit.log(chalk.green('Shared files symlinked on remote.'));
            })
            .then(function () {
                shipit.emit('shared:link:files')
            });
    }
};
