(function($) {

    const MIC_PERMISSION_STATUS = {
        GRANTED: 'granted',
        DENIED: 'denied',
        ERROR_OCCURRED: 'error-occurred',
        UNSUPPORTED: 'unsupported',
    };
    let recognition, isRecognizing = false, textBoxInitialPlaceholder;

    function addCustomizerControls() {
        if($('#micListener').length == 0) {
            $('#prompt-textarea').after('<span class="absolute p-1 rounded-md text-gray-500 bottom-1.5 md:bottom-2.5 hover:bg-gray-100 enabled:dark:hover:text-gray-400 dark:hover:bg-gray-900 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent right-1 md:right-2 disabled:opacity-40" id="micListener" disabled>'+
                '<svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" viewBox="0 0 32 32"><path d="M27,14a1,1,0,0,0-2,0A9,9,0,0,1,7,14a1,1,0,0,0-2,0A11,11,0,0,0,15,25V30a1,1,0,0,0,2,0V25A11,11,0,0,0,27,14Z" fill="#00d37b"></path><path d="M16,19a6,6,0,0,0,6-6V7A6,6,0,0,0,10,7v6A6,6,0,0,0,16,19ZM12,7a4,4,0,0,1,8,0v6a4,4,0,0,1-8,0Z" fill="#00d37b"></path></svg>'+
            '</span>');
        }

        checkBrowserCompatibility();
    }

    function initCustomizer() {
        let textBoxObserver = new MutationObserver(function(mutations) {
            if (mutations) {
                // console.log('mutations:', mutations);
                mutations.forEach(mutation => {
                    if (mutation.type == 'childList' && mutation.addedNodes) {
                        if ($(mutation.addedNodes).is($(`#__next > div.w-full.h-full`))) {
                            // Set Observer for newly created RHS element
                            textBoxObserver.observe($('#__next > div.w-full.h-full > div.relative:nth-child(2)')[0], {
                                childList: true,
                                attributes: true,
                            });
                            // Add controls to the Textbox currently visible (Old one was cleared upon switching another conversation)
                            addCustomizerControls();
                        } else if ($(mutation.addedNodes).is($(`#__next > div.w-full.h-full > div.relative:nth-child(2) > div`))) {
                            addCustomizerControls();
                        }
                    }
                });
            }
        });
        textBoxObserver.observe($('#__next')[0], {
            childList: true,
            attributes: true,
        });

        // Add controls to the Textbox currently visible
        addCustomizerControls();
    }

    function initSpeechRecognition() {
        window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        recognition = new window.SpeechRecognition();

        recognition.lang = navigator.language || navigator.userLanguage;

        recognition.addEventListener('start', (e) => {
            $('#micListener').attr('disabled', 'disabled');

            isRecognizing = true;
            $('#prompt-textarea').attr('placeholder', 'Listening...');
            $('#prompt-textarea').attr('disabled', true);
        });

        recognition.addEventListener('end', (e) => {
            $('#micListener').removeAttr('disabled');

            if ($('#prompt-textarea').val()) {
                $('#micListener').next().removeAttr('disabled');
                $('#micListener').next().click();
            }

            isRecognizing = false;
            $('#prompt-textarea').attr('placeholder', textBoxInitialPlaceholder);
            $('#prompt-textarea').removeAttr('disabled');
        });

        recognition.addEventListener('error', (e) => {
            isRecognizing = false;
            $('#prompt-textarea').attr('placeholder', textBoxInitialPlaceholder);
            $('#prompt-textarea').removeAttr('disabled');
        });

        recognition.addEventListener('result', (e) => {
            let text = e.results[0][0].transcript;

            $('#prompt-textarea').val(text).trigger('change');
        });

        recognition.start();
    }

    function checkMicNecessaryPermissions(callback) {
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

    function checkBrowserCompatibility(callback) {
        checkMicNecessaryPermissions((permissionResult, message) => {
            if (permissionResult != MIC_PERMISSION_STATUS.GRANTED) {
                if (typeof(callback) === 'function') {
                    if (permissionResult == MIC_PERMISSION_STATUS.DENIED) {
                        alert('You have denied the Microphone access. In order to use the Voice text feature, you must grant permission to access your Microphone.');
                    } else {
                        alert('Sorry! Something went wrong.');
                    }
                }

                $('#micListener').attr('disabled', 'disabled');

                return;
            }

            if (!isRecognizing) {
                $('#micListener').removeAttr('disabled');
            }

            if (typeof(callback) === 'function') {
                callback();
            }
        });
    }

    $(document).on('click', '#micListener', function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (!isRecognizing) {
            checkBrowserCompatibility(initSpeechRecognition);
        }
    });

    $(document).ready(function() {
        setTimeout(() => {
            textBoxInitialPlaceholder = $('#prompt-textarea').attr('placeholder');

            initCustomizer();
        }, 1000);
    });

}) (jQuery);
