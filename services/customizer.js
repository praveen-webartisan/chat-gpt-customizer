(function($) {

    const MIC_PERMISSION_STATUS = {
        GRANTED: 'granted',
        DENIED: 'denied',
        ERROR_OCCURRED: 'error-occurred',
        UNSUPPORTED: 'unsupported',
    };
    let mSpeechRecognition, isRecognizing = false, textBoxInitialPlaceholder;

    function addCustomizerControls() {
        if($('#cgpt-customizer-micListener').length == 0) {
            $('#prompt-textarea').after('<span class="absolute p-1 rounded-md text-gray-500 bottom-1.5 md:bottom-2.5 hover:bg-gray-100 enabled:dark:hover:text-gray-400 dark:hover:bg-gray-900 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent right-1 md:right-2 disabled:opacity-40" id="cgpt-customizer-micListener" disabled>'+
                '<svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" viewBox="0 0 32 32"><path d="M27,14a1,1,0,0,0-2,0A9,9,0,0,1,7,14a1,1,0,0,0-2,0A11,11,0,0,0,15,25V30a1,1,0,0,0,2,0V25A11,11,0,0,0,27,14Z" fill="#00d37b"></path><path d="M16,19a6,6,0,0,0,6-6V7A6,6,0,0,0,10,7v6A6,6,0,0,0,16,19ZM12,7a4,4,0,0,1,8,0v6a4,4,0,0,1-8,0Z" fill="#00d37b"></path></svg>'+
            '</span>');

            checkSpeechRecognitionCompatibility();
        }

        if($('#cgpt-customizer-screenRecorder').length == 0) {
            $('body').after('<span class="rounded-md text-gray-500 hover:bg-gray-100 enabled:dark:hover:text-gray-400 dark:hover:bg-gray-900 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent disabled:opacity-40" id="cgpt-customizer-screenRecorder" disabled>'+
                '<svg xmlns="http://www.w3.org/2000/svg" height="2rem" viewBox="0 -960 960 960" width="2rem"><path d="M333-387h60v-90q0-23.8 16.1-39.9Q425.2-533 449-533h81v70l100-100-100-100v70h-81q-48.333 0-82.167 33.833Q333-525.333 333-477v90ZM70-120q-12.75 0-21.375-8.675Q40-137.351 40-150.175 40-163 48.625-171.5T70-180h820q12.75 0 21.375 8.675 8.625 8.676 8.625 21.5 0 12.825-8.625 21.325T890-120H70Zm70-120q-24 0-42-18t-18-42v-480q0-24 18-42t42-18h680q24 0 42 18t18 42v480q0 24-18 42t-42 18H140Zm0-60h680v-480H140v480Zm0 0v-480 480Z" fill="#00d37b" /></svg>'+
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
                        addCustomizerControls();
                    }
                });
            }
        });

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

        mSpeechRecognition.lang = navigator.language || navigator.userLanguage;
        mSpeechRecognition.interimResults = true;

        mSpeechRecognition.addEventListener('start', (e) => {
            $('#cgpt-customizer-micListener').attr('disabled', 'disabled');

            isRecognizing = true;
            $('#prompt-textarea').attr('placeholder', 'Listening...');
            $('#prompt-textarea').attr('disabled', true);
        });

        mSpeechRecognition.addEventListener('end', (e) => {
            $('#micListener').removeAttr('disabled');

            if ($('#prompt-textarea').val()) {
                $('#cgpt-customizer-micListener').next().removeAttr('disabled');
                $('#cgpt-customizer-micListener').next().click();
            }

            isRecognizing = false;
            $('#prompt-textarea').attr('placeholder', textBoxInitialPlaceholder);
            $('#prompt-textarea').removeAttr('disabled');
        });

        mSpeechRecognition.addEventListener('error', (e) => {
            isRecognizing = false;
            $('#prompt-textarea').attr('placeholder', textBoxInitialPlaceholder);
            $('#prompt-textarea').removeAttr('disabled');
        });

        mSpeechRecognition.addEventListener('result', (e) => {
            let text = '';

            for (let i = 0; i < e.results.length; i++) {
                text += e.results[i][0].transcript;
            }

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
                    if (err.name == 'NotAllowedError') {
                        callback(MIC_PERMISSION_STATUS.DENIED, err);
                    } else {
                        callback(MIC_PERMISSION_STATUS.ERROR_OCCURRED, err);
                    }

                    console.log('Error when trying to get Microphone permission:', err);
                });
        } else {
            callback(MIC_PERMISSION_STATUS.UNSUPPORTED);
        }
    }

    function checkSpeechRecognitionCompatibility(callback) {
        checkMicPermissions((permissionResult, message) => {
            if (permissionResult != MIC_PERMISSION_STATUS.GRANTED) {
                if (typeof(callback) === 'function') {
                    if (permissionResult == MIC_PERMISSION_STATUS.DENIED) {
                        alert('You have denied the Microphone access. In order to use the Voice text feature, you must grant permission to access your Microphone.');
                    } else {
                        alert('Sorry! Something went wrong.');
                    }
                }

                $('#cgpt-customizer-micListener').attr('disabled', 'disabled');

                return;
            }

            if (!isRecognizing) {
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
            })
            .then((stream) => {
                $('#cgpt-customizer-screenRecorder').attr('disabled', 'disabled');

                const dateObj = new Date();
                const fileName = `${dateObj.getDate()}-${dateObj.getMonth()}-${dateObj.getFullYear()} ${dateObj.getHours()}_${dateObj.getMinutes()}_${dateObj.getSeconds()}.mp4`, mimeType = 'video/mp4';
                let recordedChunks = [];
                const mediaRecorder = new MediaRecorder(stream);

                mediaRecorder.ondataavailable = function(e) {
                    if (e.data.size > 0) {
                        recordedChunks.push(e.data);
                    }
                };

                mediaRecorder.onstop = function() {
                    try {
                        const blob = new Blob(recordedChunks, {
                            type: mimeType,
                        });

                        if ($('#cgpt-customizer-screenRecordDownloader').length > 0) {
                            $('#cgpt-customizer-screenRecordDownloader').remove();
                        }

                        $('body').append(`<a href="${URL.createObjectURL(blob)}" download="${fileName}" id="cgpt-customizer-screenRecordDownloader"></a>`);

                        $('#cgpt-customizer-screenRecordDownloader')[0].click();

                        URL.revokeObjectURL(blob);

                        $('#cgpt-customizer-screenRecordDownloader').remove();

                        recordedChunks = [];

                        $('#cgpt-customizer-screenRecorder').removeAttr('disabled');
                    } catch(err) {
                        console.log('Error occurred when downloading the record:', err);

                        alert('Oops! Some error has occurred.');

                        if (canRecordScreen()) {
                            $('#cgpt-customizer-screenRecorder').removeAttr('disabled');
                        }
                    }
                };

                mediaRecorder.start(200);
            })
            .catch((err) => {
                console.log('Error occurred when initializing screen record:', err);

                if (canRecordScreen()) {
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
                alert('Sorry, Your browser does not support this feature.');
            }
        } else {
            checkAndStartScreenRecord();
        }
    });

    $(document).ready(function() {
        setTimeout(() => {
            textBoxInitialPlaceholder = $('#prompt-textarea').attr('placeholder');

            initCustomizer();
        }, 1000);
    });

}) (jQuery);
