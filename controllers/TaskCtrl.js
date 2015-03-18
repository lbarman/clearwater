/*
 * CalepinageCtrl
 * this is the main controller for "calepinage", doing all the tilding logic
 */

taskApp.controller('TaskCtrl', ['$scope', '$http', '$filter', '$location', '$rootScope', '$document', '$cookies', '$cookieStore',
  function ($scope,$http, $filter, $location, $rootScope, $document, $cookies, $cookieStore) {

    $scope.user = 
    {
        username    : 'lbarman',
        password    : '',
        tags        : ['#epfl', '#admin', '#perso', '#job', '#people'],
        columns     : ['Urgent / Late', 'Next Steps', 'Mid Priority', 'On hold', 'Hypothetical', 'Done / Trash'],
        notes       : []
    }

    $scope.constants =
    {
        title : "Clearwater Task Management"
    }

    $scope.modal = 
    {
        modalMode : 'edit',
        isModalOpen : false,

        open : function(mode)
        {
            if(mode == undefined)
            {
                $scope.modal.modalMode = 'edit';
            }
            else
            {
                $scope.modal.modalMode = mode;
            }
            $scope.modal.isModalOpen = true;
            
            if($scope.modal.modalMode == 'password')
            {
                window.setTimeout(function(){
                    $('#myModal').modal();
                    window.setTimeout(function(){
                        $('#editTextBox').focus().select();
                    }, 500);
                }, 1000);
            }
            else
            {
                $('#myModal').modal();
                window.setTimeout(function(){
                    $('#editTextBox').focus().select();
                }, 500);
            }
        },

        closed : function()
        {
            $scope.modal.isModalOpen = false;
            if($scope.modal.modalMode == 'password')
            {
                var sig = CryptoJS.SHA1($scope.user.password);
                var pwd = sig.toString(CryptoJS.enc.Base64);
                $cookies.passwordHash = pwd;
                $scope.user.passwordHash = pwd;
                $scope.user.password = '';
                $scope.modal.modalMode = 'edit';

                $scope.ajax.loadAll();
            }
            else
            {
                if($scope.selected.lastSelectedContent != $scope.user.notes[$scope.notes.currentEdit].text)
                {
                    $scope.user.notes[$scope.notes.currentEdit].lastupdate = Date.now()
                }
                $scope.ajax.saveAll();
            }
        }
    }

    /*
     * Key press Management
     */

    $document.bind("keypress", function(event)
    {
        if($scope.modal.isModalOpen)
            return;

        var keyCode = event.keyCode;
        var w = 119;
        var a = 97;
        var s = 115;
        var d = 100;
        var e = 101;
        var q = 113;
        var p = 112;

        switch(keyCode)
        {
            case w:
                if($scope.selected.noteSelected == -1)
                    return;
                $scope.selected.moveUp();
                break;
            case s:
                if($scope.selected.noteSelected == -1)
                    return;
                $scope.selected.moveDown();
                break;
            case a:
                if($scope.selected.noteSelected == -1)
                    return;
                $scope.selected.moveLeft();
                break;
            case d:
                if($scope.selected.noteSelected == -1)
                    return;
                $scope.selected.moveRight();
                break;
            case e:
                if($scope.selected.noteSelected == -1)
                    return;
                $scope.notes.edit($scope.selected.noteSelected);
                break;
            case q:
                $scope.notes.create(0);
                break;
            case p:
                $scope.ajax.saveAll();
        }
    });

    $scope.selected =
    {
        noteSelected : -1,
        lastSelectedContent : '',

        select : function(noteId)
        {
            //double Click
            if($scope.selected.noteSelected == noteId)
            {
                $scope.notes.edit(noteId);
            }
            $scope.selected.noteSelected = noteId;
            i = $scope.notes.getPositionForNoteId(noteId);
            if($scope.user.notes[i] != undefined)
            {
                $scope.selected.lastSelectedContent = $scope.user.notes[i].text;
            }
        },

        moveUp : function()
        {
            if($scope.selected == -1)
                return;

            i = $scope.notes.getPositionForNoteId($scope.selected.noteSelected);
            $scope.columns.shiftOrderDownFromOrder($scope.user.notes[i].column, $scope.user.notes[i].order - 1);
            i = $scope.notes.getPositionForNoteId($scope.selected.noteSelected);
            $scope.user.notes[i].order -= 2;
            $scope.columns.compactAll();
            $scope.ajax.newChanges();
            
        },

        moveDown : function()
        {
            if($scope.selected == -1)
                return;
            
            i = $scope.notes.getPositionForNoteId($scope.selected.noteSelected);
            $scope.user.notes[i].order += 2;
            $scope.columns.compactAll();
            $scope.ajax.newChanges();
        },

        moveRight : function()
        {
            if($scope.selected == -1)
                return;
            
            i = $scope.notes.getPositionForNoteId($scope.selected.noteSelected);
            $scope.user.notes[i].column += 1;
            $scope.user.notes[i].column %= $scope.user.columns.length;
            $scope.columns.compactAll();
            $scope.ajax.newChanges();
        },

        moveLeft : function()
        {
            if($scope.selected == -1)
                return;
            
            i = $scope.notes.getPositionForNoteId($scope.selected.noteSelected);
            $scope.user.notes[i].column -= 1;
            if($scope.user.notes[i].column < 0)
            {
                $scope.user.notes[i].column += $scope.user.columns.length;
            }
            $scope.columns.compactAll();
            $scope.ajax.newChanges();
        }
    }

    $scope.notes = 
    {
        currentEdit : -1,

        nextFreeId : function()
        {
            max = 0;
            var i = 0;
            for (i = 0; i<$scope.user.notes.length; i++)
            {
                if(max < $scope.user.notes[i].id)
                {
                    max = $scope.user.notes[i].id;
                }
            }
            return max + 1;
        },


        getNotes : function(columnId)
        {
            notesThisColumn = $scope.user.notes.filter(function (el){
                return (el.column == columnId);
            })

            notesInOrder = notesThisColumn.sort(function(a,b) {return (a.order > b.order) ? 1 : ((b.order > a.order) ? -1 : 0);} );

            notesFiltered = notesInOrder;
            if($scope.filters.currentFilter != 'all')
            {
                notesFiltered = notesInOrder.filter(function (el){
                    return $scope.text.hasTag(el, $scope.filters.currentFilter);
                })
            }
            return notesFiltered;
        },

        getPositionForNoteId : function(noteId)
        {
            var i = 0;
            for (i = 0; i<$scope.user.notes.length; i++)
            {
                if($scope.user.notes[i].id == noteId)
                {
                    return i;
                }
            }
            return -1;
        },

        create : function(columnId)
        {
            nextFree = $scope.notes.nextFreeId()
            newNote = {id : nextFree, column : columnId, text : '...', order : 1000, lastupdate : Date.now()};
            $scope.user.notes.push(newNote);
            $scope.notes.currentEdit = $scope.user.notes.length - 1;
            $scope.columns.compact(columnId);
            $scope.modal.open();
        },

        move : function(noteId, columnId, order)
        {
            var i = 0;
            for (i = 0; i<$scope.user.notes.length; i++)
            {
                if($scope.user.notes[i].id == noteId)
                {
                   $scope.user.notes[i].column = columnId;
                   $scope.user.notes[i].order = order;
                   break; 
                }
            }
            $scope.ajax.saveAll();
        },

        delete: function(noteId)
        {
            i = $scope.notes.getPositionForNoteId(noteId);
            $scope.user.notes.splice(i, 1);
            $scope.ajax.saveAll();
        },

        edit : function(noteId)
        {
            if(noteId == -1)
                return;

            $scope.notes.currentEdit = $scope.notes.getPositionForNoteId(noteId);
            $scope.safeApply();
            $scope.modal.open();
            
        },

        currentEditTags : function()
        {
            if($scope.notes.currentEdit == -1)
                return '&nbsp1';

            if($scope.user.notes[$scope.notes.currentEdit] == undefined)
                return '&nbsp2';

            text = $scope.user.notes[$scope.notes.currentEdit].text;

            var myRegexp = /#[a-zA-Z0-9]+/g;
            var tags = ''
            while (match = myRegexp.exec(text)) {
                tags += '<span class="pills tag_'+match[0].substr(1) + '">'+match[0]+'</span>';
            }
            return tags;
        }

    }

    $scope.columns =
    {
        isTrash : function(columnId)
        {
            //by default last column is trash / finished projects
            return ($scope.user.columns.length - 1 == columnId);
        },

        compactAll : function()
        {
            var count;
            for(count = 0; count < $scope.user.columns.length; count++)
            {
                $scope.columns.compact(count);
            }
            $scope.safeApply();
        },

        compact : function(columnId)
        {
            notes = $scope.notes.getNotes(columnId);

            var i = 0;
            for (i = 0; i<notes.length; i++)
            {
                notes[i].order = i
            }
        },

        shiftOrderDownFromOrder : function(columnId, startOrder)
        {
            notes = $scope.notes.getNotes(columnId);

            var i = 0;
            for (i = 0; i<notes.length; i++)
            {
                if(notes[i].order >= startOrder)
                {
                    notes[i].order++;
                }
            }

            $scope.safeApply();
        }
    }

    /*
     * Filtering (by tag) management
     */ 

    $scope.filters =
    {
        currentFilter : 'all',

        getActiveForTag : function(tag)
        {
            if($scope.filters.currentFilter == tag)
            {
                return 'active'
            }
            else
            {
                return '';
            }
        },

        select : function(tag)
        {
            $scope.filters.currentFilter = tag;
            $scope.safeApply();
        }
    }

    /*
     * Tags management
     */

    $scope.text = 
    {
        stripTags : function(text)
        {
            return text.replace(/#[a-zA-Z0-9]+/i, '').replace(/\s{2,}/g, ' ')+'&nbsp;';
        },

        getClassesForTags : function(text)
        {
            var myRegexp = /#[a-zA-Z0-9]+/g;
            var matches = myRegexp.exec(text);
            var tags = ''
            if(matches != undefined)
            {
                for(i=0; i<matches.length; i++)
                {
                    tags += "tag_"+matches[i].substr(1) + ' ';
                }
            }
            return tags;
        },

        hasTag: function(note, tag)
        {
            return (note.text.indexOf(tag) != -1)
        }
    }

    /*
     * AJAX operations
     */

    $scope.ajax = 
    {
        savePlanned : false,

        newChanges : function()
        {
            if(!$scope.ajax.savePlanned)
            {
                window.setTimeout(function(){
                    $scope.ajax.saveAll();
                }, 500);
                $scope.ajax.savePlanned = true;
            }
        },

        saveAll : function()
        {
            $('#saveAll').html('...');

            $scope.columns.compactAll();

            url = "./ajax/saveAll.php/"+$scope.user.username+"/"+$scope.user.passwordHash+"/do"; //do is just for obfuscation

            var raw = JSON.stringify($scope.user.notes);
            var cipher = CryptoJS.AES.encrypt(raw, $scope.user.passwordHash, { format: JsonFormatter });
            var data = cipher.toString();
            var responsePromise = $http.post(url, {'data' : data});

            $scope.ajax.savePlanned = false;

            responsePromise.success(function(answer, status, headers, config)
            {
                $('#saveAll').html('Save');
            });
            responsePromise.error(function(answer, status, headers, config)
            {
                $('#saveAll').html('Save');
            });
        },
        
        loadAll : function()
        {
            $('#loadAll').html('...');
            $scope.user.notes = [];          

            url = "./ajax/getLast.php/"+$scope.user.username+"/"+$scope.user.passwordHash+"/do"; //do is just for obfuscation
            var responsePromise = $http.post(url, {'data' : JSON.stringify($scope.user.notes)});

            responsePromise.success(function(answer, status, headers, config)
            {
                try
                {
                    if(answer.data.indexOf('"ct"') != -1)
                    {
                        var cipher = answer.data;
                        var plain = CryptoJS.AES.decrypt(cipher, $scope.user.passwordHash, { format: JsonFormatter }).toString(CryptoJS.enc.Utf8);
                        newNotes = JSON.parse(plain);
                        $scope.user.notes = newNotes;
                    }
                    else
                    {
                        newNotes = JSON.parse(answer.data);
                        $scope.user.notes = newNotes;
                    }
                    $('#loadAll').html('Load');
                }
                catch(e)
                {
                    $scope.user.passwordHash = '';
                    $cookies.passwordHash = '';
                    alert("Wrong password or DB link inactive.");
                }
            });
            responsePromise.error(function(answer, status, headers, config)
            {
                $('#loadAll').html('Load');
            });
        },
    }

    /*
     * Drag-n-drop operations
     */

    $scope.drag = 
    {
        currentDrag : -1,

        noteDragged : function(event, ui, noteId, order)
        {
            $('#logoDrop').css('display', 'block')
            follow = true;
            $scope.drag.currentDrag = noteId;
            $(".dropZone").css("display", "block")
            $("#note"+noteId).addClass("dragged")
        },

        stopped : function(event, ui, noteId)
        {
            $(".dropZone").css("display", "none")
            $("#note"+noteId).removeClass("dragged")
            $('#logoDrop').css('display', 'none')
            $('#logoDrop').css('left', '-100px')
            $('#logoDrop').css('top', '-100px')
            follow = false;
        },

        noteDropped : function(event, ui, columnId, order)
        {
            $scope.columns.shiftOrderDownFromOrder(columnId, order);
            $scope.notes.move($scope.drag.currentDrag, columnId, order)
            $scope.columns.compact(columnId);

            $('#note'+$scope.drag.currentDrag).removeAttr('style');
            $('#note'+$scope.drag.currentDrag).css('position', 'relative');
            $(".dropZone").css("display", "none")
            $scope.ajax.newChanges();
        }
    }

    /*
     * Note-to-HTML conversion
     */

    $scope.noteToHtml = function(note)
    {
        var links = '';
        var i = 0;
        for (i = 0; i<$scope.user.columns.length; i++) 
        {
          links += '<li role="presentation"><a data-ng-click="notes.move('+note.id+', '+i+')" role="menuitem" tabindex="-1" href="#">'+$scope.user.columns[i]+'</a></li>';
        }

        var selected = '';
        if(note.id == $scope.selected.noteSelected)
        {
            selected = "selected_note";
        }

        var lastupdate = ((note.lastupdate == -1) ? 'never' : timestampToStr(note.lastupdate))

        var res = '<div class="note panel panel-default '+selected+' '+$scope.text.getClassesForTags(note.text)+'">'+
            '<div class="content">'+
                '<div class="dropdown">'+
                    '<button class="note_actions btn btn-default dropdown-toggle" type="button" id="dropdownMenu1" data-toggle="dropdown" aria-expanded="true">'+
                    '<span class="caret"></span>'+
                    '</button>'+
                    '<ul class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu1">'+
                        '<li role="presentation"><a role="menuitem" tabindex="-1" href="#" data-ng-click="notes.edit('+note.id+')">Edit</a></li>'+
                        '<li role="presentation" class="dropdown-header">Move to...</li>'+
                        links +
                        '<li role="presentation" class="dropdown-header">Or...</li>'+
                        '<li role="presentation"><a role="menuitem" tabindex="-1" href="#" data-ng-click="notes.delete('+note.id+')">Delete</a></li>'+
                    '</ul>'+
                '</div>'+
                '<div title="Id: '+note.id+', Order: '+note.order+', Last Updated: '+lastupdate+'" class="text" data-ng-click="selected.select('+note.id+')">'+$scope.text.stripTags(note.text)+'</div>'+
            '</div>'+
        '</div>';

        return res;
    }

    //global functions
    $scope.safeApply = function(fn)
        {
            if(this.$root)
            {
                var phase = this.$root.$$phase;
                if(phase == '$apply' || phase == '$digest') {
                  if(fn && (typeof(fn) === 'function')) {
                    fn();
                  }
                } else {
                  this.$apply(fn);
                }
            }
        };

    $scope.user.passwordHash = $cookies.passwordHash;
    if($scope.user.passwordHash == "" || $scope.user.passwordHash == undefined)
    {
        $scope.modal.open('password');
    }
    else
    {
        $scope.ajax.loadAll();
    }
    
  }]);