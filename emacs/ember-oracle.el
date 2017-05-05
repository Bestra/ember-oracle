(require 'json)

(defgroup ember-oracle nil
  "Minor mode for the ember-oracle server"
  :prefix "ember-oracle-"
  :group 'tools)

(defcustom ember-oracle-server-url "http://localhost:5300/"
  "The url of the ember oracle http server"
  :type 'string
  :group 'ember-oracle)

(defcustom ember-oracle-keymap-prefix (kbd "C-c e")
  "Ember oracle keymap prefix."
  :group 'ember-oracle
  :type 'key-sequence
  :set
  (lambda (option value)
    (when (boundp 'ember-oracle-mode-keymap)
      (define-key ember-oracle-mode-keymap ember-oracle-keymap-prefix nil)
      (define-key ember-oracle-mode-keymap value 'ember-oracle-command-prefix))
    (set-default 'ember-oracle-keymap-prefix value)))

(defun eo-create-query-string (args)
  (mapconcat (lambda (arg)
               (concat (url-hexify-string (car arg))
                       "="
                       (url-hexify-string (cdr arg))))
             args
             "&"))

(defun eo-http-get (path args)
    "Gets http response from PATH with url-encoded ARGS"
    (let* ((url (concat ember-oracle-server-url path
                        "?" (eo-create-query-string args)))
           (response-buffer (url-retrieve-synchronously url))
           (resp nil))
      (save-excursion
        (set-buffer response-buffer)
        (goto-char (point-min))
        (re-search-forward "\n\n" nil 'move)
        (setq resp (buffer-substring-no-properties (point) (point-max)))
        (message resp)
        (kill-buffer (current-buffer)))
      resp))

(defun eo-find-alternate-file ()
  "gets the alternate file"
  (eo-http-get "files/alternate" `(("path" . ,(buffer-file-name)))))

(defun eo-goto-alternate-file ()
  "switches the current buffer to the alternate file"
  (interactive)
  (find-file (eo-find-alternate-file)))

(defvar ember-oracle-commands-map (make-sparse-keymap))
(define-key ember-oracle-commands-map (kbd "f a") #'eo-goto-alternate-file)

(defvar ember-oracle-mode-keymap (make-sparse-keymap))

(define-key
  ember-oracle-mode-keymap
  ember-oracle-keymap-prefix
  ember-oracle-commands-map)

;;;###autoload
(define-minor-mode ember-oracle-mode
  "Know all about your ember project"
  nil " eo" ember-oracle-mode-keymap)

(provide 'ember-oracle-mode)
