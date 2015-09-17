module.exports = function(grunt){
    'use strict';

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        srcFiles: [
            'src/angular-slider.js'
        ],
        concat: {
            prod: {
                src: ['<%= srcFiles %>'],
                dest: 'build/<%= pkg.name %>.js'
            }
        },
        uglify: {
            options: {
                banner: '/*\n <%= pkg.name %> v<%= pkg.version %> \n (c) 2013-2014 Venturocket, Inc. http://github.com/Venturocket \n License: MIT \n*/\n'
            },
            build: {
                src: ['<%= srcFiles %>'],
                dest: 'build/<%= pkg.name %>.min.js'
            }
        },
        jshint: {
            options: {
                jshintrc: true,
                reporter: require('jshint-stylish')
            },
            all: {
                src: [
                    'Gruntfile.js',
                    'karma.conf.js',
                    'src/**/*.js',
                    'test/**/*.js'
                ],
                options: {
                    force: true
                }
            }
        },
        copy: {
            main: {
                expand: true,
                cwd: 'src/',
                src: '**',
                dest: 'build/',
                filter: 'isFile'
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-concat');

    // Default task(s).
    grunt.registerTask('default', ['jshint:all', 'uglify', 'concat:prod', 'copy:main']);

};
