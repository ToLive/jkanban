(function () {
    function r(e, n, t) {
        function o(i, f) {
            if (!n[i]) {
                if (!e[i]) {
                    let c = "function" == typeof require && require;
                    if (!f && c) return c(i, !0);
                    if (u) return u(i, !0);
                    let a = new Error("Cannot find module '" + i + "'");
                    throw a.code = "MODULE_NOT_FOUND", a
                }
                let p = n[i] = {exports: {}};
                e[i][0].call(p.exports, function (r) {
                    let n = e[i][1][r];
                    return o(n || r)
                }, p, p.exports, r, e, n, t)
            }
            return n[i].exports
        }

        for (let u = "function" == typeof require && require, i = 0; i < t.length; i++) o(t[i]);
        return o
    }

    return r
})()({
    1: [function (require, module, exports) {
        /**
         * jKanban
         * Vanilla Javascript plugin for manage kanban boards
         *
         * @site: http://www.riccardotartaglia.it/jkanban/
         * @author: Riccardo Tartaglia
         */

//Require dragula
        let dragula = require('dragula');

        (function () {
            this.jKanban = function () {
                let self = this;

                const __DEFAULT_ITEM_HANDLE_OPTIONS = {
                    enabled: false
                };
                const __DEFAULT_ITEM_ADD_OPTIONS = {
                    enabled: false,
                    boards: []
                };

                this._disallowedItemProperties = [
                    'id',
                    'title',
                    'click',
                    'context',
                    'drag',
                    'dragend',
                    'drop',
                    'order'
                ]
                this.element = ''
                this.container = ''
                this.boardContainer = []
                this.handlers = []
                this.dragula = dragula
                this.drake = ''
                this.drakeBoard = ''
                this.itemAddOptions = __DEFAULT_ITEM_ADD_OPTIONS;
                this.itemHandleOptions = __DEFAULT_ITEM_HANDLE_OPTIONS;
                let defaults = {
                    element: '',
                    gutter: '15px',
                    widthBoard: '250px',
                    responsive: '700',
                    responsivePercentage: false,
                    boards: [],
                    dragBoards: true,
                    dragItems: true, //whether can drag cards or not, useful when set permissions on it.
                    itemAddOptions: __DEFAULT_ITEM_ADD_OPTIONS,
                    itemHandleOptions: __DEFAULT_ITEM_HANDLE_OPTIONS,
                    dragEl: function (el, source) {
                    },
                    dragendEl: function (el) {
                    },
                    dropEl: function (el, target, source, sibling) {
                    },
                    dragBoard: function (el, source) {
                    },
                    dragendBoard: function (el) {
                    },
                    dropBoard: function (el, target, source, sibling) {
                    },
                    click: function (el) {
                    },
                    context: function (el, e) {
                    },
                    buttonClick: function (el, boardId) {
                    },
                    propagationHandlers: [],
                }

                if (arguments[0] && typeof arguments[0] === 'object') {
                    this.options = __extendDefaults(defaults, arguments[0])
                }

                this.__getCanMove = function (handle) {
                    if (!self.options.itemHandleOptions.enabled) {
                        return !!self.options.dragItems
                    }

                    if (self.options.itemHandleOptions.handleClass) {
                        return handle.classList.contains(self.options.itemHandleOptions.handleClass)
                    }

                    return handle.classList.contains('item_handle')
                }

                this.init = function () {
                    //set initial boards
                    __setBoard()
                    //set drag with dragula
                    if (window.innerWidth > self.options.responsive) {
                        //Init Drag Board
                        self.drakeBoard = self
                            .dragula([self.container], {
                                moves: function (el, source, handle, sibling) {
                                    if (!self.options.dragBoards) return false
                                    return (
                                        handle.classList.contains('kanban-board-header') ||
                                        handle.classList.contains('kanban-title-board')
                                    )
                                },
                                accepts: function (el, target, source, sibling) {
                                    return target.classList.contains('kanban-container')
                                },
                                revertOnSpill: true,
                                direction: 'horizontal'
                            })
                            .on('drag', function (el, source) {
                                el.classList.add('is-moving')
                                self.options.dragBoard(el, source)
                                if (typeof el.dragfn === 'function') el.dragfn(el, source)
                            })
                            .on('dragend', function (el) {
                                __updateBoardsOrder()
                                el.classList.remove('is-moving')
                                self.options.dragendBoard(el)
                                if (typeof el.dragendfn === 'function') el.dragendfn(el)
                            })
                            .on('drop', function (el, target, source, sibling) {
                                el.classList.remove('is-moving')
                                self.options.dropBoard(el, target, source, sibling)
                                if (typeof el.dropfn === 'function')
                                    el.dropfn(el, target, source, sibling)
                            })

                        //Init Drag Item
                        self.drake = self
                            .dragula(self.boardContainer, {
                                moves: function (el, source, handle, sibling) {
                                    return self.__getCanMove(handle)
                                },
                                accepts: function (el, target, source, sibling) {
                                    return (__findBoardJSON(target.parentNode.dataset.id).sortable ?? true)
                                        || (target !== source)
                                },
                                revertOnSpill: true
                            })
                            .on('cancel', function (el, container, source) {
                                self.enableAllBoards()
                            })
                            .on('drag', function (el, source) {
                                let elClass = el.getAttribute('class')
                                if (elClass !== '' && elClass.indexOf('not-draggable') > -1) {
                                    self.drake.cancel(true)
                                    return
                                }

                                el.classList.add('is-moving')

                                self.options.dragEl(el, source)

                                let boardJSON = __findBoardJSON(source.parentNode.dataset.id)
                                if (boardJSON.dragTo !== undefined) {
                                    self.options.boards.map(function (board) {
                                        if (
                                            boardJSON.dragTo.indexOf(board.id) === -1 &&
                                            board.id !== source.parentNode.dataset.id
                                        ) {
                                            self.findBoard(board.id).classList.add('disabled-board')
                                        }
                                    })
                                }

                                if (el !== null && typeof el.dragfn === 'function')
                                    el.dragfn(el, source)
                            })
                            .on('dragend', function (el) {
                                self.options.dragendEl(el)
                                if (el !== null && typeof el.dragendfn === 'function')
                                    el.dragendfn(el)
                            })
                            .on('drop', function (el, target, source, sibling) {
                                self.enableAllBoards()

                                let boardJSON = __findBoardJSON(source.parentNode.dataset.id)
                                if (boardJSON.dragTo !== undefined) {
                                    if (
                                        boardJSON.dragTo.indexOf(target.parentNode.dataset.id) === -1 &&
                                        target.parentNode.dataset.id !== source.parentNode.dataset.id
                                    ) {
                                        self.drake.cancel(true)
                                    }
                                }
                                if (el !== null) {
                                    let result = self.options.dropEl(el, target, source, sibling)
                                    if (result === false) {
                                        self.drake.cancel(true)
                                    }
                                    el.classList.remove('is-moving')
                                    if (typeof el.dropfn === 'function')
                                        el.dropfn(el, target, source, sibling)
                                }
                            })
                    }
                }

                this.enableAllBoards = function () {
                    let allB = document.querySelectorAll('.kanban-board')
                    if (allB.length > 0 && allB !== undefined) {
                        for (let i = 0; i < allB.length; i++) {
                            allB[i].classList.remove('disabled-board')
                        }
                    }
                }

                this.addElement = function (boardID, element, position) {
                    if (typeof position === 'undefined') {
                        position = -1
                    }
                    let board = self.element.querySelector(
                        '[data-id="' + boardID + '"] .kanban-drag'
                    )
                    let refElement = board.childNodes[position]
                    let nodeItem = document.createElement('div')
                    nodeItem.classList.add('kanban-item')
                    if (typeof element.id !== 'undefined' && element.id !== '') {
                        nodeItem.setAttribute('data-eid', element.id)
                    }
                    if (element.class && Array.isArray(element.class)) {
                        element.class.forEach(function (cl) {
                            nodeItem.classList.add(cl)
                        })
                    }
                    nodeItem.innerHTML = __buildItemCard(element)
                    //add function
                    nodeItem.clickfn = element.click;
                    nodeItem.contextfn = element.context;
                    nodeItem.dragfn = element.drag;
                    nodeItem.dragendfn = element.dragend;
                    nodeItem.dropfn = element.drop;
                    __appendCustomProperties(nodeItem, element);
                    __onclickHandler(nodeItem);
                    __onContextHandler(nodeItem);
                    if (self.options.itemHandleOptions.enabled) {
                        nodeItem.style.cursor = 'default';
                    }
                    board.insertBefore(nodeItem, refElement);
                    return self
                }

                this.addForm = function (boardID, formItem, options) {
                    let board = self.element.querySelector(
                        '[data-id="' + boardID + '"] .kanban-drag'
                    )
                    let _attribute = formItem.getAttribute('class')
                    formItem.setAttribute('class', _attribute + ' not-draggable')

                    if (options.position === 'top') {
                        board.insertBefore(formItem, board.firstChild);
                    } else {
                        board.appendChild(formItem);
                    }
                    return self
                }

                this.addBoards = function (boards, isInit) {
                    let boardWidth = 0;

                    if (self.options.responsivePercentage) {
                        self.container.style.width = '100%';
                        self.options.gutter = '1%';

                        if (window.innerWidth > self.options.responsive) {
                            boardWidth = (100 - boards.length * 2) / boards.length
                        } else {
                            boardWidth = 100 - boards.length * 2
                        }
                    } else {
                        boardWidth = self.options.widthBoard
                    }

                    const addButton = self.options.itemAddOptions.enabled;
                    const buttonContent = self.options.itemAddOptions.content;
                    const buttonClass = self.options.itemAddOptions.class;
                    const buttonFooter = self.options.itemAddOptions.footer;
                    const addToBoards = self.options.itemAddOptions.boards;

                    //for on all the boards
                    for (let boardkey in boards) {
                        // single board
                        let board = boards[boardkey]
                        if (!isInit) {
                            self.options.boards.push(board)
                        }

                        if (!self.options.responsivePercentage) {
                            //add width to container
                            if (self.container.style.width === '') {
                                self.container.style.width =
                                    parseInt(boardWidth) + parseInt(self.options.gutter) * 2 + 'px'
                            } else {
                                self.container.style.width =
                                    parseInt(self.container.style.width) +
                                    parseInt(boardWidth) +
                                    parseInt(self.options.gutter) * 2 +
                                    'px'
                            }
                        }
                        //create node
                        let boardNode = document.createElement('div')
                        boardNode.dataset.id = board.id
                        boardNode.dataset.order = self.container.childNodes.length + 1
                        boardNode.classList.add('kanban-board')
                        //set style
                        if (self.options.responsivePercentage) {
                            boardNode.style.width = boardWidth + '%'
                        } else {
                            boardNode.style.width = boardWidth
                        }
                        boardNode.style.marginLeft = self.options.gutter
                        boardNode.style.marginRight = self.options.gutter
                        // header board
                        let headerBoard = document.createElement('header');
                        let allClasses = '';

                        if (board.class !== '' && board.class !== undefined) {
                            allClasses = board.class.split(',');
                        } else {
                            allClasses = [];
                        }
                        headerBoard.classList.add('kanban-board-header')
                        allClasses.map(function (value) {
                            // Remove empty spaces
                            value = value.replace(/^[ ]+/g, '')
                            headerBoard.classList.add(value)
                        })
                        headerBoard.innerHTML =
                            '<div class="kanban-title-board">' + board.title + '</div>'
                        //content board
                        let contentBoard = document.createElement('main');
                        contentBoard.classList.add('kanban-drag');

                        let bodyClasses = '';

                        if (board.bodyClass !== '' && board.bodyClass !== undefined) {
                            bodyClasses = board.bodyClass.split(',');
                        } else {
                            bodyClasses = [];
                        }
                        bodyClasses.map(function (value) {
                            contentBoard.classList.add(value)
                        })
                        //add drag to array for dragula
                        self.boardContainer.push(contentBoard)
                        for (let itemkey in board.item) {
                            //create item
                            let itemKanban = board.item[itemkey]
                            let nodeItem = document.createElement('div')
                            nodeItem.classList.add('kanban-item')
                            if (itemKanban.id) {
                                nodeItem.dataset.eid = itemKanban.id
                            }
                            if (itemKanban.class && Array.isArray(itemKanban.class)) {
                                itemKanban.class.forEach(function (cl) {
                                    nodeItem.classList.add(cl)
                                })
                            }
                            nodeItem.innerHTML = __buildItemCard(itemKanban)
                            //add function
                            nodeItem.clickfn = itemKanban.click
                            nodeItem.contextfn = itemKanban.context
                            nodeItem.dragfn = itemKanban.drag
                            nodeItem.dragendfn = itemKanban.dragend
                            nodeItem.dropfn = itemKanban.drop
                            __appendCustomProperties(nodeItem, itemKanban)
                            //add click handler of item
                            __onclickHandler(nodeItem)
                            __onContextHandler(nodeItem)
                            if (self.options.itemHandleOptions.enabled) {
                                nodeItem.style.cursor = 'default'
                            }
                            contentBoard.appendChild(nodeItem)
                        }
                        //footer board
                        let footerBoard = document.createElement('footer')
                        // if add button is true, add button to the board
                        if (addButton) {
                            if (addToBoards.includes(board.id) || addToBoards.length === 0) {
                                let btn = document.createElement('BUTTON')
                                let t = document.createTextNode(buttonContent ? buttonContent : '+')
                                btn.setAttribute(
                                    'class',
                                    buttonClass ? buttonClass : 'kanban-title-button btn btn-default btn-xs'
                                );
                                btn.appendChild(t);

                                if (buttonFooter) {
                                    footerBoard.appendChild(btn);
                                } else {
                                    headerBoard.appendChild(btn);
                                }
                                __onButtonClickHandler(btn, board.id);
                            }
                        }
                        //board assembly
                        boardNode.appendChild(headerBoard);
                        boardNode.appendChild(contentBoard);
                        boardNode.appendChild(footerBoard);
                        //board add
                        self.container.appendChild(boardNode);
                    }
                    return self
                }

                this.findBoard = function (id) {
                    let el = self.element.querySelector('[data-id="' + id + '"]')
                    return el
                }

                this.getParentBoardID = function (el) {
                    if (typeof el === 'string') {
                        el = self.element.querySelector('[data-eid="' + el + '"]')
                    }
                    if (el === null) {
                        return null
                    }
                    return el.parentNode.parentNode.dataset.id
                }

                this.moveElement = function (targetBoardID, elementID, element) {
                    if (targetBoardID === this.getParentBoardID(elementID)) {
                        return
                    }

                    this.removeElement(elementID)
                    return this.addElement(targetBoardID, element)
                }

                this.replaceElement = function (el, element) {
                    let nodeItem = el
                    if (typeof nodeItem === 'string') {
                        nodeItem = self.element.querySelector('[data-eid="' + el + '"]')
                    }
                    nodeItem.innerHTML = __buildItemCard(element)
                    // add function
                    nodeItem.clickfn = element.click
                    nodeItem.contextfn = element.context
                    nodeItem.dragfn = element.drag
                    nodeItem.dragendfn = element.dragend
                    nodeItem.dropfn = element.drop
                    __appendCustomProperties(nodeItem, element)
                    __onclickHandler(nodeItem)
                    __onContextHandler(nodeItem)
                    return self
                }

                this.findElement = function (id) {
                    let el = self.element.querySelector('[data-eid="' + id + '"]')
                    return el
                }

                this.getBoardElements = function (id) {
                    let board = self.element.querySelector(
                        '[data-id="' + id + '"] .kanban-drag'
                    )
                    return board.childNodes
                }

                this.removeElement = function (el) {
                    if (typeof el === 'string')
                        el = self.element.querySelector('[data-eid="' + el + '"]')
                    if (el !== null) {
                        //fallback for IE
                        if (typeof el.remove == 'function') {
                            el.remove()
                        } else {
                            el.parentNode.removeChild(el)
                        }
                    }
                    return self
                }

                this.removeBoard = function (board) {
                    let boardElement = null
                    if (typeof board === 'string')
                        boardElement = self.element.querySelector('[data-id="' + board + '"]')
                    if (boardElement !== null) {
                        //fallback for IE
                        if (typeof boardElement.remove == 'function') {
                            boardElement.remove()
                        } else {
                            boardElement.parentNode.removeChild(boardElement)
                        }
                    }

                    // remove thboard in options.boards
                    for (let i = 0; i < self.options.boards.length; i++) {
                        if (self.options.boards[i].id === board) {
                            self.options.boards.splice(i, 1)
                            break
                        }
                    }

                    return self
                }

                // board button on click function
                this.onButtonClick = function (el) {
                }

                //PRIVATE FUNCTION
                function __extendDefaults(source, properties) {
                    let property
                    for (property in properties) {
                        if (properties.hasOwnProperty(property)) {
                            source[property] = properties[property]
                        }
                    }
                    return source
                }

                function __setBoard() {
                    self.element = document.querySelector(self.options.element)
                    //create container
                    let boardContainer = document.createElement('div')
                    boardContainer.classList.add('kanban-container')
                    self.container = boardContainer
                    //add boards

                    if (document.querySelector(self.options.element).dataset.hasOwnProperty('board')) {
                        url = document.querySelector(self.options.element).dataset.board
                        window.fetch(url, {
                            method: 'GET',
                            headers: {'Content-Type': 'application/json'}
                        })
                            .then(function (response) {
                                // log response text
                                response.json().then(function (data) {
                                    self.options.boards = data
                                    self.addBoards(self.options.boards, true)
                                })

                            })
                            .catch(function (error) {
                                console.log('Error: ', error)
                            })
                    } else {
                        self.addBoards(self.options.boards, true)
                    }

                    //appends to container
                    self.element.appendChild(self.container)
                }

                function __onclickHandler(nodeItem, clickfn) {
                    nodeItem.addEventListener('click', function (e) {
                        if (!self.options.propagationHandlers.includes('click')) e.preventDefault()
                        self.options.click(this)
                        if (typeof this.clickfn === 'function') this.clickfn(this)
                    })
                }

                function __onContextHandler(nodeItem, contextfn) {
                    if (nodeItem.addEventListener) {
                        nodeItem.addEventListener('contextmenu', function (e) {
                            if (!self.options.propagationHandlers.includes('context')) e.preventDefault()
                            self.options.context(this, e)
                            if (typeof this.contextfn === 'function') this.contextfn(this, e)
                        }, false)
                    } else {
                        nodeItem.attachEvent('oncontextmenu', function () {
                            self.options.context(this)
                            if (typeof this.contextfn === 'function') this.contextfn(this)
                            if (!self.options.propagationHandlers.includes('context')) window.event.returnValue = false
                        })
                    }
                }

                function __onButtonClickHandler(nodeItem, boardId) {
                    nodeItem.addEventListener('click', function (e) {
                        e.preventDefault()
                        self.options.buttonClick(this, boardId)
                        // if(typeof(this.clickfn) === 'function')
                        //     this.clickfn(this);
                    })
                }

                function __findBoardJSON(id) {
                    let el = []
                    self.options.boards.map(function (board) {
                        if (board.id === id) {
                            return el.push(board)
                        }
                    })
                    return el[0]
                }

                function __appendCustomProperties(element, parentObject) {
                    for (let propertyName in parentObject) {
                        if (self._disallowedItemProperties.indexOf(propertyName) > -1) {
                            continue
                        }

                        element.setAttribute(
                            'data-' + propertyName,
                            parentObject[propertyName]
                        )
                    }
                }

                function __updateBoardsOrder() {
                    let index = 1
                    for (let i = 0; i < self.container.childNodes.length; i++) {
                        self.container.childNodes[i].dataset.order = index++
                    }
                }

                function __buildItemCard(item) {
                    let result = 'title' in item ? item.title : '';

                    if (self.options.itemHandleOptions.enabled) {
                        if ((self.options.itemHandleOptions.customHandler || undefined) === undefined) {
                            let customCssHandler = self.options.itemHandleOptions.customCssHandler
                            let customCssIconHandler = self.options.itemHandleOptions.customCssIconHandler
                            let customItemLayout = self.options.itemHandleOptions.customItemLayout
                            if ((customCssHandler || undefined) === undefined) {
                                customCssHandler = 'drag_handler';
                            }

                            if ((customCssIconHandler || undefined) === undefined) {
                                customCssIconHandler = customCssHandler + '_icon';
                            }

                            if ((customItemLayout || undefined) === undefined) {
                                customItemLayout = '';
                            }

                            result = '<div class=\'item_handle ' + customCssHandler + '\'><i class=\'item_handle ' + customCssIconHandler + '\'></i></div><div>' + result + '</div>'
                        } else {
                            result = '<div> ' + self.options.itemHandleOptions.customHandler.replace(/%([^%]+)%/g, function (match, key) {
                                return item[key] !== undefined ? item[key] : ''
                            }) + ' </div>'
                            return result
                        }
                    }

                    return result
                }

                //init plugin
                this.init()
            }
        })()

    }, {"dragula": 9}], 2: [function (require, module, exports) {
        module.exports = function atoa(a, n) {
            return Array.prototype.slice.call(a, n);
        }

    }, {}], 3: [function (require, module, exports) {
        'use strict';

        let ticky = require('ticky');

        module.exports = function debounce(fn, args, ctx) {
            if (!fn) {
                return;
            }
            ticky(function run() {
                fn.apply(ctx || null, args || []);
            });
        };

    }, {"ticky": 11}], 4: [function (require, module, exports) {
        'use strict';

        let atoa = require('atoa');
        let debounce = require('./debounce');

        module.exports = function emitter(thing, options) {
            let opts = options || {};
            let evt = {};
            if (thing === undefined) {
                thing = {};
            }
            thing.on = function (type, fn) {
                if (!evt[type]) {
                    evt[type] = [fn];
                } else {
                    evt[type].push(fn);
                }
                return thing;
            };
            thing.once = function (type, fn) {
                fn._once = true; // thing.off(fn) still works!
                thing.on(type, fn);
                return thing;
            };
            thing.off = function (type, fn) {
                let c = arguments.length;
                if (c === 1) {
                    delete evt[type];
                } else if (c === 0) {
                    evt = {};
                } else {
                    let et = evt[type];
                    if (!et) {
                        return thing;
                    }
                    et.splice(et.indexOf(fn), 1);
                }
                return thing;
            };
            thing.emit = function () {
                let args = atoa(arguments);
                return thing.emitterSnapshot(args.shift()).apply(this, args);
            };
            thing.emitterSnapshot = function (type) {
                let et = (evt[type] || []).slice(0);
                return function () {
                    let args = atoa(arguments);
                    let ctx = this || thing;
                    if (type === 'error' && opts.throws !== false && !et.length) {
                        throw args.length === 1 ? args[0] : args;
                    }
                    et.forEach(function emitter(listen) {
                        if (opts.async) {
                            debounce(listen, args, ctx);
                        } else {
                            listen.apply(ctx, args);
                        }
                        if (listen._once) {
                            thing.off(type, listen);
                        }
                    });
                    return thing;
                };
            };
            return thing;
        };

    }, {"./debounce": 3, "atoa": 2}], 5: [function (require, module, exports) {
        (function (global) {
            (function () {
                'use strict';

                let customEvent = require('custom-event');
                let eventmap = require('./eventmap');
                let doc = global.document;
                let addEvent = addEventEasy;
                let removeEvent = removeEventEasy;
                let hardCache = [];

                if (!global.addEventListener) {
                    addEvent = addEventHard;
                    removeEvent = removeEventHard;
                }

                module.exports = {
                    add: addEvent,
                    remove: removeEvent,
                    fabricate: fabricateEvent
                };

                function addEventEasy(el, type, fn, capturing) {
                    return el.addEventListener(type, fn, capturing);
                }

                function addEventHard(el, type, fn) {
                    return el.attachEvent('on' + type, wrap(el, type, fn));
                }

                function removeEventEasy(el, type, fn, capturing) {
                    return el.removeEventListener(type, fn, capturing);
                }

                function removeEventHard(el, type, fn) {
                    let listener = unwrap(el, type, fn);
                    if (listener) {
                        return el.detachEvent('on' + type, listener);
                    }
                }

                function fabricateEvent(el, type, model) {
                    let e = eventmap.indexOf(type) === -1 ? makeCustomEvent() : makeClassicEvent();
                    if (el.dispatchEvent) {
                        el.dispatchEvent(e);
                    } else {
                        el.fireEvent('on' + type, e);
                    }

                    function makeClassicEvent() {
                        let e;
                        if (doc.createEvent) {
                            e = doc.createEvent('Event');
                            e.initEvent(type, true, true);
                        } else if (doc.createEventObject) {
                            e = doc.createEventObject();
                        }
                        return e;
                    }

                    function makeCustomEvent() {
                        return new customEvent(type, {detail: model});
                    }
                }

                function wrapperFactory(el, type, fn) {
                    return function wrapper(originalEvent) {
                        let e = originalEvent || global.event;
                        e.target = e.target || e.srcElement;
                        e.preventDefault = e.preventDefault || function preventDefault() {
                            e.returnValue = false;
                        };
                        e.stopPropagation = e.stopPropagation || function stopPropagation() {
                            e.cancelBubble = true;
                        };
                        e.which = e.which || e.keyCode;
                        fn.call(el, e);
                    };
                }

                function wrap(el, type, fn) {
                    let wrapper = unwrap(el, type, fn) || wrapperFactory(el, type, fn);
                    hardCache.push({
                        wrapper: wrapper,
                        element: el,
                        type: type,
                        fn: fn
                    });
                    return wrapper;
                }

                function unwrap(el, type, fn) {
                    let i = find(el, type, fn);
                    if (i) {
                        let wrapper = hardCache[i].wrapper;
                        hardCache.splice(i, 1); // free up a tad of memory
                        return wrapper;
                    }
                }

                function find(el, type, fn) {
                    let i, item;
                    for (i = 0; i < hardCache.length; i++) {
                        item = hardCache[i];
                        if (item.element === el && item.type === type && item.fn === fn) {
                            return i;
                        }
                    }
                }

            }).call(this)
        }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
    }, {"./eventmap": 6, "custom-event": 7}], 6: [function (require, module, exports) {
        (function (global) {
            (function () {
                'use strict';

                let eventmap = [];
                let eventname = '';
                let ron = /^on/;

                for (eventname in global) {
                    if (ron.test(eventname)) {
                        eventmap.push(eventname.slice(2));
                    }
                }

                module.exports = eventmap;

            }).call(this)
        }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
    }, {}], 7: [function (require, module, exports) {
        (function (global) {
            (function () {

                let NativeCustomEvent = global.CustomEvent;

                function useNative() {
                    try {
                        let p = new NativeCustomEvent('cat', {detail: {foo: 'bar'}});
                        return 'cat' === p.type && 'bar' === p.detail.foo;
                    } catch (e) {
                    }
                    return false;
                }

                /**
                 * Cross-browser `CustomEvent` constructor.
                 *
                 * https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent.CustomEvent
                 *
                 * @public
                 */

                module.exports = useNative() ? NativeCustomEvent :

                    // IE >= 9
                    'undefined' !== typeof document && 'function' === typeof document.createEvent ? function CustomEvent(type, params) {
                            let e = document.createEvent('CustomEvent');
                            if (params) {
                                e.initCustomEvent(type, params.bubbles, params.cancelable, params.detail);
                            } else {
                                e.initCustomEvent(type, false, false, void 0);
                            }
                            return e;
                        } :

                        // IE <= 8
                        function CustomEvent(type, params) {
                            let e = document.createEventObject();
                            e.type = type;
                            if (params) {
                                e.bubbles = Boolean(params.bubbles);
                                e.cancelable = Boolean(params.cancelable);
                                e.detail = params.detail;
                            } else {
                                e.bubbles = false;
                                e.cancelable = false;
                                e.detail = void 0;
                            }
                            return e;
                        }

            }).call(this)
        }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
    }, {}], 8: [function (require, module, exports) {
        'use strict';

        let cache = {};
        let start = '(?:^|\\s)';
        let end = '(?:\\s|$)';

        function lookupClass(className) {
            let cached = cache[className];
            if (cached) {
                cached.lastIndex = 0;
            } else {
                cache[className] = cached = new RegExp(start + className + end, 'g');
            }
            return cached;
        }

        function addClass(el, className) {
            let current = el.className;
            if (!current.length) {
                el.className = className;
            } else if (!lookupClass(className).test(current)) {
                el.className += ' ' + className;
            }
        }

        function rmClass(el, className) {
            el.className = el.className.replace(lookupClass(className), ' ').trim();
        }

        module.exports = {
            add: addClass,
            rm: rmClass
        };

    }, {}], 9: [function (require, module, exports) {
        (function (global) {
            (function () {
                'use strict';

                let emitter = require('contra/emitter');
                let crossvent = require('crossvent');
                let classes = require('./classes');
                let doc = document;
                let documentElement = doc.documentElement;

                function dragula(initialContainers, options) {
                    let len = arguments.length;
                    if (len === 1 && Array.isArray(initialContainers) === false) {
                        options = initialContainers;
                        initialContainers = [];
                    }
                    let _mirror; // mirror image
                    let _source; // source container
                    let _item; // item being dragged
                    let _offsetX; // reference x
                    let _offsetY; // reference y
                    let _moveX; // reference move x
                    let _moveY; // reference move y
                    let _initialSibling; // reference sibling when grabbed
                    let _currentSibling; // reference sibling now
                    let _copy; // item used for copying
                    let _renderTimer; // timer for setTimeout renderMirrorImage
                    let _lastDropTarget = null; // last container item was over
                    let _grabbed; // holds mousedown context until first mousemove

                    let o = options || {};
                    if (o.moves === void 0) {
                        o.moves = always;
                    }
                    if (o.accepts === void 0) {
                        o.accepts = always;
                    }
                    if (o.invalid === void 0) {
                        o.invalid = invalidTarget;
                    }
                    if (o.containers === void 0) {
                        o.containers = initialContainers || [];
                    }
                    if (o.isContainer === void 0) {
                        o.isContainer = never;
                    }
                    if (o.copy === void 0) {
                        o.copy = false;
                    }
                    if (o.copySortSource === void 0) {
                        o.copySortSource = false;
                    }
                    if (o.revertOnSpill === void 0) {
                        o.revertOnSpill = false;
                    }
                    if (o.removeOnSpill === void 0) {
                        o.removeOnSpill = false;
                    }
                    if (o.direction === void 0) {
                        o.direction = 'vertical';
                    }
                    if (o.ignoreInputTextSelection === void 0) {
                        o.ignoreInputTextSelection = true;
                    }
                    if (o.mirrorContainer === void 0) {
                        o.mirrorContainer = doc.body;
                    }

                    let drake = emitter({
                        containers: o.containers,
                        start: manualStart,
                        end: end,
                        cancel: cancel,
                        remove: remove,
                        destroy: destroy,
                        canMove: canMove,
                        dragging: false
                    });

                    if (o.removeOnSpill === true) {
                        drake.on('over', spillOver).on('out', spillOut);
                    }

                    events();

                    return drake;

                    function isContainer(el) {
                        return drake.containers.indexOf(el) !== -1 || o.isContainer(el);
                    }

                    function events(remove) {
                        let op = remove ? 'remove' : 'add';
                        touchy(documentElement, op, 'mousedown', grab);
                        touchy(documentElement, op, 'mouseup', release);
                    }

                    function eventualMovements(remove) {
                        let op = remove ? 'remove' : 'add';
                        touchy(documentElement, op, 'mousemove', startBecauseMouseMoved);
                    }

                    function movements(remove) {
                        let op = remove ? 'remove' : 'add';
                        crossvent[op](documentElement, 'selectstart', preventGrabbed); // IE8
                        crossvent[op](documentElement, 'click', preventGrabbed);
                    }

                    function destroy() {
                        events(true);
                        release({});
                    }

                    function preventGrabbed(e) {
                        if (_grabbed) {
                            e.preventDefault();
                        }
                    }

                    function grab(e) {
                        _moveX = e.clientX;
                        _moveY = e.clientY;

                        let ignore = whichMouseButton(e) !== 1 || e.metaKey || e.ctrlKey;
                        if (ignore) {
                            return; // we only care about honest-to-god left clicks and touch events
                        }
                        let item = e.target;
                        let context = canStart(item);
                        if (!context) {
                            return;
                        }
                        _grabbed = context;
                        eventualMovements();
                        if (e.type === 'mousedown') {
                            if (isInput(item)) { // see also: https://github.com/bevacqua/dragula/issues/208
                                item.focus(); // fixes https://github.com/bevacqua/dragula/issues/176
                            } else {
                                e.preventDefault(); // fixes https://github.com/bevacqua/dragula/issues/155
                            }
                        }
                    }

                    function startBecauseMouseMoved(e) {
                        if (!_grabbed) {
                            return;
                        }
                        if (whichMouseButton(e) === 0) {
                            release({});
                            return; // when text is selected on an input and then dragged, mouseup doesn't fire. this is our only hope
                        }

                        // truthy check fixes #239, equality fixes #207, fixes #501
                        if ((e.clientX !== void 0 && Math.abs(e.clientX - _moveX) <= (o.slideFactorX || 0)) &&
                            (e.clientY !== void 0 && Math.abs(e.clientY - _moveY) <= (o.slideFactorY || 0))) {
                            return;
                        }

                        if (o.ignoreInputTextSelection) {
                            let clientX = getCoord('clientX', e) || 0;
                            let clientY = getCoord('clientY', e) || 0;
                            let elementBehindCursor = doc.elementFromPoint(clientX, clientY);
                            if (isInput(elementBehindCursor)) {
                                return;
                            }
                        }

                        let grabbed = _grabbed; // call to end() unsets _grabbed
                        eventualMovements(true);
                        movements();
                        end();
                        start(grabbed);

                        let offset = getOffset(_item);
                        _offsetX = getCoord('pageX', e) - offset.left;
                        _offsetY = getCoord('pageY', e) - offset.top;

                        classes.add(_copy || _item, 'gu-transit');
                        renderMirrorImage();
                        drag(e);
                    }

                    function canStart(item) {
                        if (drake.dragging && _mirror) {
                            return;
                        }
                        if (isContainer(item)) {
                            return; // don't drag container itself
                        }
                        let handle = item;
                        while (getParent(item) && isContainer(getParent(item)) === false) {
                            if (o.invalid(item, handle)) {
                                return;
                            }
                            item = getParent(item); // drag target should be a top element
                            if (!item) {
                                return;
                            }
                        }
                        let source = getParent(item);
                        if (!source) {
                            return;
                        }
                        if (o.invalid(item, handle)) {
                            return;
                        }

                        let movable = o.moves(item, source, handle, nextEl(item));
                        if (!movable) {
                            return;
                        }

                        return {
                            item: item,
                            source: source
                        };
                    }

                    function canMove(item) {
                        return !!canStart(item);
                    }

                    function manualStart(item) {
                        let context = canStart(item);
                        if (context) {
                            start(context);
                        }
                    }

                    function start(context) {
                        if (isCopy(context.item, context.source)) {
                            _copy = context.item.cloneNode(true);
                            drake.emit('cloned', _copy, context.item, 'copy');
                        }

                        _source = context.source;
                        _item = context.item;
                        _initialSibling = _currentSibling = nextEl(context.item);

                        drake.dragging = true;
                        drake.emit('drag', _item, _source);
                    }

                    function invalidTarget() {
                        return false;
                    }

                    function end() {
                        if (!drake.dragging) {
                            return;
                        }
                        let item = _copy || _item;
                        drop(item, getParent(item));
                    }

                    function ungrab() {
                        _grabbed = false;
                        eventualMovements(true);
                        movements(true);
                    }

                    function release(e) {
                        ungrab();

                        if (!drake.dragging) {
                            return;
                        }
                        let item = _copy || _item;
                        let clientX = getCoord('clientX', e) || 0;
                        let clientY = getCoord('clientY', e) || 0;
                        let elementBehindCursor = getElementBehindPoint(_mirror, clientX, clientY);
                        let dropTarget = findDropTarget(elementBehindCursor, clientX, clientY);
                        if (dropTarget && ((_copy && o.copySortSource) || (!_copy || dropTarget !== _source))) {
                            drop(item, dropTarget);
                        } else if (o.removeOnSpill) {
                            remove();
                        } else {
                            cancel();
                        }
                    }

                    function drop(item, target) {
                        let parent = getParent(item);
                        if (_copy && o.copySortSource && target === _source) {
                            parent.removeChild(_item);
                        }
                        if (isInitialPlacement(target)) {
                            drake.emit('cancel', item, _source, _source);
                        } else {
                            drake.emit('drop', item, target, _source, _currentSibling);
                        }
                        cleanup();
                    }

                    function remove() {
                        if (!drake.dragging) {
                            return;
                        }
                        let item = _copy || _item;
                        let parent = getParent(item);
                        if (parent) {
                            parent.removeChild(item);
                        }
                        drake.emit(_copy ? 'cancel' : 'remove', item, parent, _source);
                        cleanup();
                    }

                    function cancel(revert) {
                        if (!drake.dragging) {
                            return;
                        }
                        let reverts = arguments.length > 0 ? revert : o.revertOnSpill;
                        let item = _copy || _item;
                        let parent = getParent(item);
                        let initial = isInitialPlacement(parent);
                        if (initial === false && reverts) {
                            if (_copy) {
                                if (parent) {
                                    parent.removeChild(_copy);
                                }
                            } else {
                                _source.insertBefore(item, _initialSibling);
                            }
                        }
                        if (initial || reverts) {
                            drake.emit('cancel', item, _source, _source);
                        } else {
                            drake.emit('drop', item, parent, _source, _currentSibling);
                        }
                        cleanup();
                    }

                    function cleanup() {
                        let item = _copy || _item;
                        ungrab();
                        removeMirrorImage();
                        if (item) {
                            classes.rm(item, 'gu-transit');
                        }
                        if (_renderTimer) {
                            clearTimeout(_renderTimer);
                        }
                        drake.dragging = false;
                        if (_lastDropTarget) {
                            drake.emit('out', item, _lastDropTarget, _source);
                        }
                        drake.emit('dragend', item);
                        _source = _item = _copy = _initialSibling = _currentSibling = _renderTimer = _lastDropTarget = null;
                    }

                    function isInitialPlacement(target, s) {
                        let sibling;
                        if (s !== void 0) {
                            sibling = s;
                        } else if (_mirror) {
                            sibling = _currentSibling;
                        } else {
                            sibling = nextEl(_copy || _item);
                        }
                        return target === _source && sibling === _initialSibling;
                    }

                    function findDropTarget(elementBehindCursor, clientX, clientY) {
                        let target = elementBehindCursor;
                        while (target && !accepted()) {
                            target = getParent(target);
                        }
                        return target;

                        function accepted() {
                            let droppable = isContainer(target);
                            if (droppable === false) {
                                return false;
                            }

                            let immediate = getImmediateChild(target, elementBehindCursor);
                            let reference = getReference(target, immediate, clientX, clientY);
                            let initial = isInitialPlacement(target, reference);
                            if (initial) {
                                return true; // should always be able to drop it right back where it was
                            }
                            return o.accepts(_item, target, _source, reference);
                        }
                    }

                    function drag(e) {
                        if (!_mirror) {
                            return;
                        }
                        e.preventDefault();

                        let clientX = getCoord('clientX', e) || 0;
                        let clientY = getCoord('clientY', e) || 0;
                        let x = clientX - _offsetX;
                        let y = clientY - _offsetY;

                        _mirror.style.left = x + 'px';
                        _mirror.style.top = y + 'px';

                        let item = _copy || _item;
                        let elementBehindCursor = getElementBehindPoint(_mirror, clientX, clientY);
                        let dropTarget = findDropTarget(elementBehindCursor, clientX, clientY);
                        let changed = dropTarget !== null && dropTarget !== _lastDropTarget;
                        if (changed || dropTarget === null) {
                            out();
                            _lastDropTarget = dropTarget;
                            over();
                        }
                        let parent = getParent(item);
                        if (dropTarget === _source && _copy && !o.copySortSource) {
                            if (parent) {
                                parent.removeChild(item);
                            }
                            return;
                        }
                        let reference;
                        let immediate = getImmediateChild(dropTarget, elementBehindCursor);
                        if (immediate !== null) {
                            reference = getReference(dropTarget, immediate, clientX, clientY);
                        } else if (o.revertOnSpill === true && !_copy) {
                            reference = _initialSibling;
                            dropTarget = _source;
                        } else {
                            if (_copy && parent) {
                                parent.removeChild(item);
                            }
                            return;
                        }
                        if (
                            (reference === null && changed) ||
                            reference !== item &&
                            reference !== nextEl(item)
                        ) {
                            _currentSibling = reference;
                            dropTarget.insertBefore(item, reference);
                            drake.emit('shadow', item, dropTarget, _source);
                        }

                        function moved(type) {
                            drake.emit(type, item, _lastDropTarget, _source);
                        }

                        function over() {
                            if (changed) {
                                moved('over');
                            }
                        }

                        function out() {
                            if (_lastDropTarget) {
                                moved('out');
                            }
                        }
                    }

                    function spillOver(el) {
                        classes.rm(el, 'gu-hide');
                    }

                    function spillOut(el) {
                        if (drake.dragging) {
                            classes.add(el, 'gu-hide');
                        }
                    }

                    function renderMirrorImage() {
                        if (_mirror) {
                            return;
                        }
                        let rect = _item.getBoundingClientRect();
                        _mirror = _item.cloneNode(true);
                        _mirror.style.width = getRectWidth(rect) + 'px';
                        _mirror.style.height = getRectHeight(rect) + 'px';
                        classes.rm(_mirror, 'gu-transit');
                        classes.add(_mirror, 'gu-mirror');
                        o.mirrorContainer.appendChild(_mirror);
                        touchy(documentElement, 'add', 'mousemove', drag);
                        classes.add(o.mirrorContainer, 'gu-unselectable');
                        drake.emit('cloned', _mirror, _item, 'mirror');
                    }

                    function removeMirrorImage() {
                        if (_mirror) {
                            classes.rm(o.mirrorContainer, 'gu-unselectable');
                            touchy(documentElement, 'remove', 'mousemove', drag);
                            getParent(_mirror).removeChild(_mirror);
                            _mirror = null;
                        }
                    }

                    function getImmediateChild(dropTarget, target) {
                        let immediate = target;
                        while (immediate !== dropTarget && getParent(immediate) !== dropTarget) {
                            immediate = getParent(immediate);
                        }
                        if (immediate === documentElement) {
                            return null;
                        }
                        return immediate;
                    }

                    function getReference(dropTarget, target, x, y) {
                        let horizontal = o.direction === 'horizontal';
                        let reference = target !== dropTarget ? inside() : outside();
                        return reference;

                        function outside() { // slower, but able to figure out any position
                            let len = dropTarget.children.length;
                            let i;
                            let el;
                            let rect;
                            for (i = 0; i < len; i++) {
                                el = dropTarget.children[i];
                                rect = el.getBoundingClientRect();
                                if (horizontal && (rect.left + rect.width / 2) > x) {
                                    return el;
                                }
                                if (!horizontal && (rect.top + rect.height / 2) > y) {
                                    return el;
                                }
                            }
                            return null;
                        }

                        function inside() { // faster, but only available if dropped inside a child element
                            let rect = target.getBoundingClientRect();
                            if (horizontal) {
                                return resolve(x > rect.left + getRectWidth(rect) / 2);
                            }
                            return resolve(y > rect.top + getRectHeight(rect) / 2);
                        }

                        function resolve(after) {
                            return after ? nextEl(target) : target;
                        }
                    }

                    function isCopy(item, container) {
                        return typeof o.copy === 'boolean' ? o.copy : o.copy(item, container);
                    }
                }

                function touchy(el, op, type, fn) {
                    let touch = {
                        mouseup: 'touchend',
                        mousedown: 'touchstart',
                        mousemove: 'touchmove'
                    };
                    let pointers = {
                        mouseup: 'pointerup',
                        mousedown: 'pointerdown',
                        mousemove: 'pointermove'
                    };
                    let microsoft = {
                        mouseup: 'MSPointerUp',
                        mousedown: 'MSPointerDown',
                        mousemove: 'MSPointerMove'
                    };
                    if (global.navigator.pointerEnabled) {
                        crossvent[op](el, pointers[type], fn);
                    } else if (global.navigator.msPointerEnabled) {
                        crossvent[op](el, microsoft[type], fn);
                    } else {
                        crossvent[op](el, touch[type], fn);
                        crossvent[op](el, type, fn);
                    }
                }

                function whichMouseButton(e) {
                    if (e.touches !== void 0) {
                        return e.touches.length;
                    }
                    if (e.which !== void 0 && e.which !== 0) {
                        return e.which;
                    } // see https://github.com/bevacqua/dragula/issues/261
                    if (e.buttons !== void 0) {
                        return e.buttons;
                    }
                    let button = e.button;
                    if (button !== void 0) { // see https://github.com/jquery/jquery/blob/99e8ff1baa7ae341e94bb89c3e84570c7c3ad9ea/src/event.js#L573-L575
                        return button & 1 ? 1 : button & 2 ? 3 : (button & 4 ? 2 : 0);
                    }
                }

                function getOffset(el) {
                    let rect = el.getBoundingClientRect();
                    return {
                        left: rect.left + getScroll('scrollLeft', 'pageXOffset'),
                        top: rect.top + getScroll('scrollTop', 'pageYOffset')
                    };
                }

                function getScroll(scrollProp, offsetProp) {
                    if (typeof global[offsetProp] !== 'undefined') {
                        return global[offsetProp];
                    }
                    if (documentElement.clientHeight) {
                        return documentElement[scrollProp];
                    }
                    return doc.body[scrollProp];
                }

                function getElementBehindPoint(point, x, y) {
                    point = point || {};
                    let state = point.className || '';
                    let el;
                    point.className += ' gu-hide';
                    el = doc.elementFromPoint(x, y);
                    point.className = state;
                    return el;
                }

                function never() {
                    return false;
                }

                function always() {
                    return true;
                }

                function getRectWidth(rect) {
                    return rect.width || (rect.right - rect.left);
                }

                function getRectHeight(rect) {
                    return rect.height || (rect.bottom - rect.top);
                }

                function getParent(el) {
                    return el.parentNode === doc ? null : el.parentNode;
                }

                function isInput(el) {
                    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || isEditable(el);
                }

                function isEditable(el) {
                    if (!el) {
                        return false;
                    } // no parents were editable
                    if (el.contentEditable === 'false') {
                        return false;
                    } // stop the lookup
                    if (el.contentEditable === 'true') {
                        return true;
                    } // found a contentEditable element in the chain
                    return isEditable(getParent(el)); // contentEditable is set to 'inherit'
                }

                function nextEl(el) {
                    return el.nextElementSibling || manually();

                    function manually() {
                        let sibling = el;
                        do {
                            sibling = sibling.nextSibling;
                        } while (sibling && sibling.nodeType !== 1);
                        return sibling;
                    }
                }

                function getEventHost(e) {
                    // on touchend event, we have to use `e.changedTouches`
                    // see http://stackoverflow.com/questions/7192563/touchend-event-properties
                    // see https://github.com/bevacqua/dragula/issues/34
                    if (e.targetTouches && e.targetTouches.length) {
                        return e.targetTouches[0];
                    }
                    if (e.changedTouches && e.changedTouches.length) {
                        return e.changedTouches[0];
                    }
                    return e;
                }

                function getCoord(coord, e) {
                    let host = getEventHost(e);
                    let missMap = {
                        pageX: 'clientX', // IE8
                        pageY: 'clientY' // IE8
                    };
                    if (coord in missMap && !(coord in host) && missMap[coord] in host) {
                        coord = missMap[coord];
                    }
                    return host[coord];
                }

                module.exports = dragula;

            }).call(this)
        }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
    }, {"./classes": 8, "contra/emitter": 4, "crossvent": 5}], 10: [function (require, module, exports) {
// shim for using process in browser
        let process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

        let cachedSetTimeout;
        let cachedClearTimeout;

        function defaultSetTimout() {
            throw new Error('setTimeout has not been defined');
        }

        function defaultClearTimeout() {
            throw new Error('clearTimeout has not been defined');
        }

        (function () {
            try {
                if (typeof setTimeout === 'function') {
                    cachedSetTimeout = setTimeout;
                } else {
                    cachedSetTimeout = defaultSetTimout;
                }
            } catch (e) {
                cachedSetTimeout = defaultSetTimout;
            }
            try {
                if (typeof clearTimeout === 'function') {
                    cachedClearTimeout = clearTimeout;
                } else {
                    cachedClearTimeout = defaultClearTimeout;
                }
            } catch (e) {
                cachedClearTimeout = defaultClearTimeout;
            }
        }())

        function runTimeout(fun) {
            if (cachedSetTimeout === setTimeout) {
                //normal enviroments in sane situations
                return setTimeout(fun, 0);
            }
            // if setTimeout wasn't available but was latter defined
            if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
                cachedSetTimeout = setTimeout;
                return setTimeout(fun, 0);
            }
            try {
                // when when somebody has screwed with setTimeout but no I.E. maddness
                return cachedSetTimeout(fun, 0);
            } catch (e) {
                try {
                    // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
                    return cachedSetTimeout.call(null, fun, 0);
                } catch (e) {
                    // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
                    return cachedSetTimeout.call(this, fun, 0);
                }
            }


        }

        function runClearTimeout(marker) {
            if (cachedClearTimeout === clearTimeout) {
                //normal enviroments in sane situations
                return clearTimeout(marker);
            }
            // if clearTimeout wasn't available but was latter defined
            if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
                cachedClearTimeout = clearTimeout;
                return clearTimeout(marker);
            }
            try {
                // when when somebody has screwed with setTimeout but no I.E. maddness
                return cachedClearTimeout(marker);
            } catch (e) {
                try {
                    // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
                    return cachedClearTimeout.call(null, marker);
                } catch (e) {
                    // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
                    // Some versions of I.E. have different rules for clearTimeout vs setTimeout
                    return cachedClearTimeout.call(this, marker);
                }
            }


        }

        let queue = [];
        let draining = false;
        let currentQueue;
        let queueIndex = -1;

        function cleanUpNextTick() {
            if (!draining || !currentQueue) {
                return;
            }
            draining = false;
            if (currentQueue.length) {
                queue = currentQueue.concat(queue);
            } else {
                queueIndex = -1;
            }
            if (queue.length) {
                drainQueue();
            }
        }

        function drainQueue() {
            if (draining) {
                return;
            }
            let timeout = runTimeout(cleanUpNextTick);
            draining = true;

            let len = queue.length;
            while (len) {
                currentQueue = queue;
                queue = [];
                while (++queueIndex < len) {
                    if (currentQueue) {
                        currentQueue[queueIndex].run();
                    }
                }
                queueIndex = -1;
                len = queue.length;
            }
            currentQueue = null;
            draining = false;
            runClearTimeout(timeout);
        }

        process.nextTick = function (fun) {
            let args = new Array(arguments.length - 1);
            if (arguments.length > 1) {
                for (let i = 1; i < arguments.length; i++) {
                    args[i - 1] = arguments[i];
                }
            }
            queue.push(new Item(fun, args));
            if (queue.length === 1 && !draining) {
                runTimeout(drainQueue);
            }
        };

// v8 likes predictible objects
        function Item(fun, array) {
            this.fun = fun;
            this.array = array;
        }

        Item.prototype.run = function () {
            this.fun.apply(null, this.array);
        };
        process.title = 'browser';
        process.browser = true;
        process.env = {};
        process.argv = [];
        process.version = ''; // empty string to avoid regexp issues
        process.versions = {};

        function noop() {
        }

        process.on = noop;
        process.addListener = noop;
        process.once = noop;
        process.off = noop;
        process.removeListener = noop;
        process.removeAllListeners = noop;
        process.emit = noop;
        process.prependListener = noop;
        process.prependOnceListener = noop;

        process.listeners = function (name) {
            return []
        }

        process.binding = function (name) {
            throw new Error('process.binding is not supported');
        };

        process.cwd = function () {
            return '/'
        };
        process.chdir = function (dir) {
            throw new Error('process.chdir is not supported');
        };
        process.umask = function () {
            return 0;
        };

    }, {}], 11: [function (require, module, exports) {
        (function (setImmediate) {
            (function () {
                let si = typeof setImmediate === 'function', tick;
                if (si) {
                    tick = function (fn) {
                        setImmediate(fn);
                    };
                } else {
                    tick = function (fn) {
                        setTimeout(fn, 0);
                    };
                }

                module.exports = tick;
            }).call(this)
        }).call(this, require("timers").setImmediate)
    }, {"timers": 12}], 12: [function (require, module, exports) {
        (function (setImmediate, clearImmediate) {
            (function () {
                let nextTick = require('process/browser.js').nextTick;
                let apply = Function.prototype.apply;
                let slice = Array.prototype.slice;
                let immediateIds = {};
                let nextImmediateId = 0;

// DOM APIs, for completeness

                exports.setTimeout = function () {
                    return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
                };
                exports.setInterval = function () {
                    return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
                };
                exports.clearTimeout =
                    exports.clearInterval = function (timeout) {
                        timeout.close();
                    };

                function Timeout(id, clearFn) {
                    this._id = id;
                    this._clearFn = clearFn;
                }

                Timeout.prototype.unref = Timeout.prototype.ref = function () {
                };
                Timeout.prototype.close = function () {
                    this._clearFn.call(window, this._id);
                };

// Does not start the time, just sets up the members needed.
                exports.enroll = function (item, msecs) {
                    clearTimeout(item._idleTimeoutId);
                    item._idleTimeout = msecs;
                };

                exports.unenroll = function (item) {
                    clearTimeout(item._idleTimeoutId);
                    item._idleTimeout = -1;
                };

                exports._unrefActive = exports.active = function (item) {
                    clearTimeout(item._idleTimeoutId);

                    let msecs = item._idleTimeout;
                    if (msecs >= 0) {
                        item._idleTimeoutId = setTimeout(function onTimeout() {
                            if (item._onTimeout)
                                item._onTimeout();
                        }, msecs);
                    }
                };

// That's not how node.js implements it but the exposed api is the same.
                exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function (fn) {
                    let id = nextImmediateId++;
                    let args = arguments.length < 2 ? false : slice.call(arguments, 1);

                    immediateIds[id] = true;

                    nextTick(function onNextTick() {
                        if (immediateIds[id]) {
                            // fn.call() is faster so we optimize for the common use-case
                            // @see http://jsperf.com/call-apply-segu
                            if (args) {
                                fn.apply(null, args);
                            } else {
                                fn.call(null);
                            }
                            // Prevent ids from leaking
                            exports.clearImmediate(id);
                        }
                    });

                    return id;
                };

                exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function (id) {
                    delete immediateIds[id];
                };
            }).call(this)
        }).call(this, require("timers").setImmediate, require("timers").clearImmediate)
    }, {"process/browser.js": 10, "timers": 12}]
}, {}, [1]);
