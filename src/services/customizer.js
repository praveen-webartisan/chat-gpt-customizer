(function($) {

    const MIC_PERMISSION_STATUS = {
        GRANTED: 'granted',
        DENIED: 'denied',
        ERROR_OCCURRED: 'error-occurred',
        UNSUPPORTED: 'unsupported',
    };
    let mSpeechRecognition, isRecognizing = false, defaultTxtMessagePlaceholder;

    function addCustomizerControls() {
        // Add the Mic button
        if($('#cgpt-customizer-micListener').length == 0) {
            $('#prompt-textarea').after('<span class="" id="cgpt-customizer-micListener" disabled>'+
                '<svg xmlns="http://www.w3.org/2000/svg" width="1.2rem" height="1.2rem" viewBox="0 0 14 21"><g fill="none" fill-rule="evenodd" id="Page-1" stroke="none" stroke-width="1"><g fill="currentColor" id="Icons-AV" transform="translate(-3.000000, -43.000000)"><g id="mic" transform="translate(3.000000, 43.500000)"><path d="M7,12 C8.7,12 10,10.7 10,9 L10,3 C10,1.3 8.7,0 7,0 C5.3,0 4,1.3 4,3 L4,9 C4,10.7 5.3,12 7,12 L7,12 Z M12.3,9 C12.3,12 9.8,14.1 7,14.1 C4.2,14.1 1.7,12 1.7,9 L0,9 C0,12.4 2.7,15.2 6,15.7 L6,19 L8,19 L8,15.7 C11.3,15.2 14,12.4 14,9 L12.3,9 L12.3,9 Z" id="Shape"/></g></g></g></svg>'+
            '</span>');

            checkSpeechRecognitionCompatibility();
        }

        // Add the Screen record button
        if($('#cgpt-customizer-screenRecorder').length == 0) {
            $('body').after('<span class="" id="cgpt-customizer-screenRecorder" disabled>'+
                '<svg xmlns="http://www.w3.org/2000/svg" height="2rem" viewBox="0 -960 960 960" width="2rem"><path d="M333-387h60v-90q0-23.8 16.1-39.9Q425.2-533 449-533h81v70l100-100-100-100v70h-81q-48.333 0-82.167 33.833Q333-525.333 333-477v90ZM70-120q-12.75 0-21.375-8.675Q40-137.351 40-150.175 40-163 48.625-171.5T70-180h820q12.75 0 21.375 8.675 8.625 8.676 8.625 21.5 0 12.825-8.625 21.325T890-120H70Zm70-120q-24 0-42-18t-18-42v-480q0-24 18-42t42-18h680q24 0 42 18t18 42v480q0 24-18 42t-42 18H140Zm0-60h680v-480H140v480Zm0 0v-480 480Z" fill="currentColor" /></svg>'+
            '</span>');

            if (canRecordScreen()) {
                $('#cgpt-customizer-screenRecorder').removeAttr('disabled');
            }
        }
    }

    function initCustomizer() {
        let textBoxObserver = new MutationObserver(function(mutations) {
            if (mutations) {
                // console.log('mutations:', mutations);
                mutations.forEach(mutation => {
                    if (mutation.type == 'childList' && mutation.addedNodes) {
                        // Add Control buttons when DOM is modified
                        addCustomizerControls();
                    }
                });
            }
        });

        // Observe DOM changes
        textBoxObserver.observe($('#__next')[0], {
            subtree: true,
            childList: true,
            attributes: true,
        });

        // Add controls to the Textbox currently visible
        addCustomizerControls();
    }

    function initSpeechRecognition() {
        window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        mSpeechRecognition = new window.SpeechRecognition();

        // Set browser language to speech recognition
        mSpeechRecognition.lang = navigator.language || navigator.userLanguage;
        mSpeechRecognition.interimResults = true;

        mSpeechRecognition.addEventListener('start', (e) => {
            // disable mic button to prevent double click
            $('#cgpt-customizer-micListener').attr('disabled', 'disabled');

            // update recognition state
            isRecognizing = true;

            // update text box placeholder and disable it to prevent the user from typing (temporarily)
            $('#prompt-textarea').attr('placeholder', 'Listening...');
            $('#prompt-textarea').attr('disabled', true);
        });

        mSpeechRecognition.addEventListener('end', (e) => {
            // reset the button state when speech recognition end
            $('#cgpt-customizer-micListener').removeAttr('disabled');

            if ($('#prompt-textarea').val()) {
                // trigger click event on "Send" button
                $('#cgpt-customizer-micListener').next().removeAttr('disabled');
                $('#cgpt-customizer-micListener').next().click();
            }

            // reset the recognition state
            isRecognizing = false;

            // reset the text box state
            $('#prompt-textarea').attr('placeholder', defaultTxtMessagePlaceholder);
            $('#prompt-textarea').removeAttr('disabled');

            // reset the "Send" button state
            $('#cgpt-customizer-micListener').next().attr('disabled', true);
        });

        mSpeechRecognition.addEventListener('error', (e) => {
            // reset the recognition state
            isRecognizing = false;

            // reset the text box state
            $('#prompt-textarea').attr('placeholder', defaultTxtMessagePlaceholder);
            $('#prompt-textarea').removeAttr('disabled');
        });

        mSpeechRecognition.addEventListener('result', (e) => {
            let text = '';

            for (let i = 0; i < e.results.length; i++) {
                text += e.results[i][0].transcript;
            }

            // implement the typing effect when user is speaking
            $('#prompt-textarea').val(text).trigger('change');
        });

        mSpeechRecognition.start();
    }

    function checkMicPermissions(callback) {
        if (navigator && navigator.mediaDevices && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
            navigator.mediaDevices.getUserMedia({ video: false, audio: true })
                .then((stream) => {
                    callback(MIC_PERMISSION_STATUS.GRANTED);
                })
                .catch(err => {
                    // check if mic permission is denied by the user
                    if (err.name == 'NotAllowedError') {
                        callback(MIC_PERMISSION_STATUS.DENIED, err);
                    } else {
                        callback(MIC_PERMISSION_STATUS.ERROR_OCCURRED, err);
                    }

                    console.log('Error when trying to get Microphone permission:', err);
                });
        } else {
            // hide the mic button when speech recognition is unavailable
            $('#cgpt-customizer-micListener').attr('disabled', 'disabled');
            $('#cgpt-customizer-micListener').addClass('cgpt-customizer-hidden-elem');

            callback(MIC_PERMISSION_STATUS.UNSUPPORTED);
        }
    }

    function checkSpeechRecognitionCompatibility(callback) {
        checkMicPermissions((permissionResult, message) => {
            if (permissionResult != MIC_PERMISSION_STATUS.GRANTED) {
                if (typeof(callback) === 'function') {
                    if (permissionResult == MIC_PERMISSION_STATUS.DENIED) {
                        // alert the user that mic permission is needed
                        alert('You have denied the Microphone access. In order to use the Voice text feature, you must grant permission to access your Microphone.');
                    } else if (permissionResult != MIC_PERMISSION_STATUS.UNSUPPORTED) {
                        // alert the user that some error has occurred
                        alert('Sorry! Something went wrong.');
                    }
                }

                // disable mic button when error occurred
                $('#cgpt-customizer-micListener').attr('disabled', 'disabled');

                return;
            }

            if (!isRecognizing) {
                // enable mic button when access granted
                $('#cgpt-customizer-micListener').removeAttr('disabled');
            }

            if (typeof(callback) === 'function') {
                callback();
            }
        });
    }

    function canRecordScreen() {
        return navigator && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia && MediaRecorder;
    }

    function checkAndStartScreenRecord() {
        if (canRecordScreen()) {
            navigator.mediaDevices.getDisplayMedia({
                audio: true,
                video: {
                    mediaSource: 'screen'
                },
                preferCurrentTab: true,
            })
            .then((stream) => {
                // disable screen record button to avoid double click
                $('#cgpt-customizer-screenRecorder').attr('disabled', 'disabled');

                const dateObj = new Date();
                // prepare video file name with current date and time
                const fileName = `${dateObj.getDate()}-${dateObj.getMonth()}-${dateObj.getFullYear()} ${dateObj.getHours()}_${dateObj.getMinutes()}_${dateObj.getSeconds()}.mp4`, mimeType = 'video/mp4';
                let recordedChunks = [];
                const mediaRecorder = new MediaRecorder(stream);

                mediaRecorder.ondataavailable = function(e) {
                    console.log('ondataavailable', e);
                    if (e.data.size > 0) {
                        // get chunk data
                        recordedChunks.push(e.data);
                    }
                };

                mediaRecorder.onstop = function() {
                    // TODO: check why recording stop not detected when user records "This Tab"
                    console.log('onstop');
                    try {
                        const blob = new Blob(recordedChunks, {
                            type: mimeType,
                        });

                        // remove download button
                        if ($('#cgpt-customizer-screenRecordDownloader').length > 0) {
                            $('#cgpt-customizer-screenRecordDownloader').remove();
                        }

                        // create a button to download the screen record as a video
                        $('body').append(`<a href="${URL.createObjectURL(blob)}" download="${fileName}" id="cgpt-customizer-screenRecordDownloader"></a>`);

                        // trigger click event on the download button
                        $('#cgpt-customizer-screenRecordDownloader')[0].click();

                        // revoke blob once the video has been downloaded
                        URL.revokeObjectURL(blob);

                        // remove the download button
                        $('#cgpt-customizer-screenRecordDownloader').remove();

                        recordedChunks = [];

                        // enable the screen record after the video has downloaded
                        $('#cgpt-customizer-screenRecorder').removeAttr('disabled');
                    } catch(err) {
                        console.log('Error occurred when downloading the record:', err);

                        // inform user when error occurred
                        alert('Oops! Some error has occurred.');

                        if (canRecordScreen()) {
                            // enable the screen record after the error
                            $('#cgpt-customizer-screenRecorder').removeAttr('disabled');
                        }
                    }
                };

                mediaRecorder.start(200);
            })
            .catch((err) => {
                console.log('Error occurred when initializing screen record:', err);

                if (canRecordScreen()) {
                    // enable the screen record after the error
                    $('#cgpt-customizer-screenRecorder').removeAttr('disabled');
                }
            });
        }
    }

    $(document).on('click', '#cgpt-customizer-micListener', function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (!isRecognizing) {
            checkSpeechRecognitionCompatibility(initSpeechRecognition);
        }
    });

    $(document).on('click', '#cgpt-customizer-screenRecorder', function(e) {
        e.preventDefault();
        e.stopPropagation();

        if ($(this).attr('disabled')) {
            if (!canRecordScreen()) {
                // inform user that screen record feature is unsupported
                alert('Sorry, Your browser does not support this feature.');
            }
        } else {
            checkAndStartScreenRecord();
        }
    });

    $(document).ready(function() {
        setTimeout(() => {
            // Store the default placeholder to a variable
            defaultTxtMessagePlaceholder = $('#prompt-textarea').attr('placeholder');

            initCustomizer();
        }, 1000);
    });

}) (jQuery);
