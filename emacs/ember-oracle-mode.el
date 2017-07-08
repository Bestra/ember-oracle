;;; ember-oracle.el --- Emacs interface to the ember-oracle server
;;
;; Author: Chris Westra
;; URL: http://github.com/bestra/ember-oracle
;;
;;;;;;;;;;;;;;;;
;;;; MIT License
;;
;; Permission is hereby granted, free of charge, to any person
;; obtaining a copy of this software and associated documentation
;; files (the "Software"), to deal in the Software without
;; restriction, including without limitation the rights to use, copy,
;; modify, merge, publish, distribute, sublicense, and/or sell copies
;; of the Software, and to permit persons to whom the Software is
;; furnished to do so, subject to the following conditions:
;;
;; The above copyright notice and this permission notice shall be
;; included in all copies or substantial portions of the Software.
;;
;; THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
;; EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
;; MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
;; NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
;; BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
;; ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
;; CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
;; SOFTWARE.
;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;
;;; Commentary:
;;
;; This minor mode provides key bindings for navigating an ember-cli
;; project.
;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(require 'json)
(require 'cl)

;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;; Custom Variables
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

(defcustom ember-oracle-completion-system 'default
  "Which completion system ember-oracle-mode should use."
  :group 'ember-oracle
  :type '(radio
          (const :tag "Helm" helm)
          (const :tag "Ido" ido)
          (const :tag "Default" default)))

;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;; Low-level fns for server interaction
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

(defun eo--parse-response (json)
  "Parses a json-formatted http response"
  (let ((json-object-type 'plist))
    (json-read-from-string json)))

(defun eo-find-alternate-file ()
  "gets the alternate file"
  (eo-http-get "files/alternate" `(("path" . ,(buffer-file-name)))))

(defun eo-find-parent-templates ()
  "gets the parent templates for a given file from the server.
returns a vector of filenames formatted 'path:line:column'"
  (eo--parse-response
   (eo-http-get "templates/parents" `(("path" . ,(buffer-file-name))))))

(defun eo--goto-position (file line column)
  (find-file file)
  (goto-line line)
  (move-to-column column))

;;;;;;;;;;;;;
;;;; Completion

(defun eo--completing-read (question matches)
  "A smarter completing-read which poses QUESTION with matches being MATCHES.
This replacement uses a completion system according to
`ember-oracle-completion-system'."
  (cond
   ((eq ember-oracle-completion-system 'ido)
    (ido-completing-read question matches))
   ((and (eq ember-oracle-completion-system 'helm)
         (fboundp 'helm-comp-read))
    (helm-comp-read question matches
                    :must-match t))
   (t (completing-read question matches))))

;;;;;;;;;;;;;;;;;;;;;;
;;;; Interactive fns
(defun eo-goto-alternate-file ()
  "switches the current buffer to the alternate file"
  (interactive)
  (find-file (eo-find-alternate-file)))

(defun eo-goto-definition ()
  "finds the 'definition' location of the symbol under the cursor"
  (interactive)
  (let* ((response (eo-http-get "templates/definition"
                                `(("path" . ,(buffer-file-name))
                                  ("line" . ,(number-to-string (line-number-at-pos)))
                                  ("column" . ,(number-to-string (current-column))))))
         (parsed (eo--parse-response response))
         (path (plist-get parsed ':filePath))
         (position-info (plist-get parsed ':position))
         (line (plist-get position-info ':line))
         (column (plist-get position-info ':column)))
    (eo--goto-position path line column)
    ))

(defun eo-show-property-sources ()
  "shows a list of sources for a given bound property or this.get()"
  (interactive)
  (let* ((response (eo-http-get "propertySources"
                                `(("path" . ,(buffer-file-name))
                                  ("line" . ,(number-to-string (line-number-at-pos)))
                                  ("column" . ,(number-to-string (current-column))))))
         (parsed (eo--parse-response response))
         (candidates (seq-into parsed 'list))
         (choice (eo--completing-read "Select a location to view "
                                      candidates))
         (parts (split-string choice ":")))
    (cl-destructuring-bind (file line column . preview) parts
      (eo--goto-position file
                         (string-to-number line)
                         (string-to-number column)))
    ))

(defun eo-show-property-sinks ()
  "shows a list of sinks for a given bound property or this.get()"
  (interactive)
  (let* ((response (eo-http-get "propertySinks"
                                `(("path" . ,(buffer-file-name))
                                  ("line" . ,(number-to-string (line-number-at-pos)))
                                  ("column" . ,(number-to-string (current-column))))))
         (parsed (eo--parse-response response))
         (candidates (seq-into parsed 'list))
         (choice (eo--completing-read "Select a location to view "
                                      candidates))
         (parts (split-string choice ":")))
    (cl-destructuring-bind (file line column . preview) parts
      (eo--goto-position file
                         (string-to-number line)
                         (string-to-number column)))
    ))

(defun eo-show-parent-templates ()
  "displays a list of parent templates"
  (interactive)
  (let* ((candidates (seq-into (eo-find-parent-templates) 'list))
         (choice (eo--completing-read "Select a template to view "
                                      candidates))
         (parts (split-string choice ":")))
    (cl-destructuring-bind (file line column) parts
      (eo--goto-position file line column))))

;;;;;;;;;;;;;;;;;;;;;;;;
;;;; Keyboard Commands
(defvar ember-oracle-commands-map (make-sparse-keymap))
(define-key ember-oracle-commands-map (kbd "f a") #'eo-goto-alternate-file)
(define-key ember-oracle-commands-map (kbd "f p") #'eo-show-parent-templates)
(define-key ember-oracle-commands-map (kbd "f d") #'eo-goto-definition)
(define-key ember-oracle-commands-map (kbd "f s") #'eo-show-property-sources)
(define-key ember-oracle-commands-map (kbd "f S") #'eo-show-property-sinks)


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
