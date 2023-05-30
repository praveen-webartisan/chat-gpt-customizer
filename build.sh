#!/bin/bash

buildForPlatform() {
    platform="$1"

    echo "Preparing build for $platform..."

    if ! [ -d "build" ]
    then
        mkdir build
    fi

    if [ -d "build/$platform" ]
    then
        rm -rf "build/$platform"
    fi

    mkdir "build/$platform"

    cp -r "src/." "build/$platform/"

    cp -r "platforms/$platform/." "build/$platform/"

    echo "Files copied."
}

main() {
    platform="$1"

    if [ -z "$platform" ]
    then
        buildForPlatform "chrome"
        buildForPlatform "firefox"

        notify-send "Build success."
    else
        if [ "$platform" == "chrome" ] || [ "$platform" == "firefox" ]
        then
            buildForPlatform "$platform"
            notify-send "Build success for "$platform" platform."
        else
            echo "Invalid platform. Platform should be either \"chrome\" or \"firefox\"."
            exit 1
        fi
    fi
}

main "$@"
