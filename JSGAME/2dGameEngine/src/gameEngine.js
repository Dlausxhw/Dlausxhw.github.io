/**
 * 游戏引擎类，负责管理游戏的整体逻辑、绘制、资源加载等
 */
class GameEngine {
    constructor() {
        /** 已加载图片 私有属性 @type {image[]} */
        this.__images = [];
        /** 已加载音频 私有属性 @type {audio[]} */
        this.__audios = {};
        /** 已加载动画 私有属性 @type {Animation[]} */
        this.__animations = {};
        /** 已创建对象 @type {GameObject[]} */
        this.objects = [];

        /** 已保存场景 @type {Object.<string, GameObject[]>} */
        this.__levels = {};
        /** 注册的事件 @type {Object.<string, Function>} */
        this.__updateEvent = {};

        /** 刷新频率 @type {number} */
        this.fps = 60;
        /** 私有时长计数 @type {number} */
        this.__time = 0.0;
        /** 时长差 @type {number} */
        this.deltaTime = 0.0;
    }

    /**
     * 初始化引擎
     * @param {string} canvas - 画布对象
     * @param {number} width - 画布的宽度
     * @param {number} height - 画布的高度
     */
    init(canvas, width, height) {
        this.canvas = document.getElementById(canvas);
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;

        // bind event
        this.__mouseDown__ = this.__mouseDown__.bind(this);
        this.__mouseUp__ = this.__mouseUp__.bind(this);
        this.__mouseMove__ = this.__mouseMove__.bind(this);

        this.canvas.addEventListener("mousedown", this.__mouseDown__);
        this.canvas.addEventListener("mouseup", this.__mouseUp__);
        this.canvas.addEventListener("mousemove", this.__mouseMove__);
        this.canvas.setAttribute("tabindex", "0");
        this.canvas.addEventListener("keydown", (e) => {Input.__keyDownHandle(e);})
        this.canvas.addEventListener("keyup", (e) => {Input.__keyUpHandle(e);})
    }
    /**
     * 注册更新事件
     * @param {string} name - 事件名称
     * @param {function} callback - 游戏循环中的更新事件回调函数
     */
    registerEvent(name, callback) {
        this.__updateEvent[name] = callback;
    }

    /**
     * 移除更新事件
     * @param {string} name - 事件名称
     */
    removeEvent(name) {
        delete this.__updateEvent[name];
    }

    /**
     * 获取动画
     * @param {string} _class - 动画所属的类
     * @param {string} name - 动画的名称
     * @returns {Animation} - 动画对象
     */
    getAnimation(_class, name, speed = 1) {
        return this.__animations[_class][name].animation(speed);
    }

    /**
     * 处理鼠标按下事件
     * @param {MouseEvent} event - 鼠标按下事件对象
     */
    __mouseDown__(event) {
        const rect = this.canvas.getBoundingClientRect();
        let mouseX = event.clientX - rect.left;
        let mouseY = event.clientY - rect.top;
        for(let object of this.objects) {
            object.onMouseDown(mouseX, mouseY);
        }
    }

    /**
     * 处理鼠标松开事件
     * @param {MouseEvent} event - 鼠标松开事件对象
     */
    __mouseUp__(event) {
        const rect = this.canvas.getBoundingClientRect();
        let mouseX = event.clientX - rect.left;
        let mouseY = event.clientY - rect.top;
        for(let object of this.objects) {
            object.onMouseUp(mouseX, mouseY);
        }
    }

    /**
     * 处理鼠标移动事件
     * @param {MouseEvent} event - 鼠标移动事件对象
     */
    __mouseMove__(event) {
        const rect = this.canvas.getBoundingClientRect();
        let mouseX = event.clientX - rect.left;
        let mouseY = event.clientY - rect.top;
        for(let object of this.objects) {
            object.onMouseMove(mouseX, mouseY);
        }
    }
    
    /**
     * 游戏引擎更新方法，负责更新游戏逻辑和绘制画面
     */
    __update__() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.objects.sort((a, b) => a.order - b.order);
        for(let object of this.objects) {
            object.update && object.update();
            if(object.visible) this.draw(object);
        }
            

        this.deltaTime = (Date.now() - this.__time) / 1000;
        this.__time = Date.now();

        for(let gameEvent of Object.values(this.__updateEvent)) {
            gameEvent();
        }

        Input.__keyDown = Input.__deepCopy(Input.__NULLKEYDOWN);
        Input.__keyUp = Input.__deepCopy(Input.__NULLKEYUP);
    }

    /**
     * 预加载图片
     * @param {string} imgsrc - 图片的源路径
     * @returns {Promise<Image>} - 返回加载完成的图片对象
     */
    preload(imgsrc) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.src = imgsrc;
            image.onload = () => {
                this.__images.push(image);
                resolve(image);
            };
            image.onerror = () => reject(new Error(`Failed to load image: src=${imgsrc}`));
        });
    }

    /**
     * 预加载音频
     * @param {string} name - 音频的名称
     * @param {string} src - 音频的源路径
     * @returns {Promise<Audio>} - 返回加载完成的音频对象
     */
    preloadAudio(name, src) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(src);
            audio.oncanplaythrough = () => { this.__audios[name] = audio; resolve(audio); };
            audio.onerror = () => reject(new Error(`Failed to load audio: src=${src}`));
        });
    }

    /**
     * 播放音频
     * @param {string} name - 音频的名称
     * @param {function} callback - 音频播放结束后的回调函数
     */
    playAudio(name, callback, time)  {
        this.__audios[name].play();
        if(callback && !time) this.__audios[name].onended = callback;
        if(callback && time) setTimeout(callback, time);
    }


    /**
     * 暂停音频
     * @param {string} name - 音频的名称
     */
    pauseAudio(name) { this.__audios[name].pause(); }

    /**
     * 设置音频音量
     * @param {string} name - 音频的名称
     * @param {number} volume - 音量大小，范围为 0 到 1
     */
    setAudioVolume(name, volume) { this.__audios[name].volume = volume; }

    /**
     * 设置音频循环播放
     * @param {string} name - 音频的名称
     * @param {boolean} loop - 是否循环播放
     */
    setAudioLoop(name, loop) { this.__audios[name].loop = loop; }

    /**
     * 保存当前关卡状态
     * @param {string} name - 关卡的名称
     */
    save_level(name) {
        this.__levels[name] = this.objects;
    }

    /**
     * 加载指定的关卡
     * @param {string} name - 关卡的名称
     */
    load_level(name) {
        this.objects = this.__levels[name];
    }

    /**
     * 暂停一段时间
     * @param {number} ms - 暂停的时间（毫秒）
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 绘制对象
     * @param {GameObject} object - 需要绘制的对象
     */
    draw(object) {
    if (!object.image && !object.text) return;
    if (object.image === null && object.text !== null) {
        this.ctx.font = object.style.font;
        this.ctx.fillStyle = object.style.color;
        this.ctx.fillText(object.text, object.x, object.y);
        return;
    }

    this.ctx.save();

    // 设置透明度
    this.ctx.globalAlpha = object.opacity !== undefined ? object.opacity : 1;

    // 设置默认滑动比例
    const sliderX = object.slider.x !== undefined ? object.slider.x : 1;
    const sliderY = object.slider.y !== undefined ? object.slider.y : 1;

    // slider
    this.ctx.beginPath();
    this.ctx.rect(object.x, object.y, object.width * sliderX, object.height * sliderY);
    this.ctx.clip();

    // rotation
    this.ctx.translate(object.x + object.width / 2, object.y + object.height / 2);
    this.ctx.scale(object.flip.x ? -1 : 1, object.flip.y ? -1 : 1);
    this.ctx.rotate(object.rotation * Mathf.PI / 180);
    this.ctx.drawImage(object.image, -object.width / 2, -object.height / 2, object.width, object.height); // 绘制图像

    this.ctx.restore();
}

    /**
     * 获取预加载的图片
     * @param {string} name - 图片名称
     * @returns {image} - 返回找到的图片对象
     */
    getImage(name) {
        for(let i = 0; i < this.__images.length; i++) {
            let filename = this.__images[i].src.split('/').pop();
            if(filename === name) {
                return this.__images[i];
            }
        }
        return null;
    }

    /**
     * 启动游戏引擎
     */
    start() {
        setInterval(() => {
            this.__update__();
        }, 1000 / this.fps);
    }

    /**
     * 清空场景中的所有对象
     */
    clear() {
        this.objects = [];
    }

    
}

class Resources {
    constructor() {
        this.struct = {};
    }

    createFolder(name) {
        this.struct[name] = {};
    }

    add(filename, src, type) {
        let struct = this.struct
        let fn = null
        if(filename.split("/").length > 1) {
            let folder = filename.split("/");
            fn = folder.pop();
            for(let f of folder) {
                if(!struct[f]) {
                    console.error(`Folder ${f} not found`);
                    return;
                }
                struct = struct[f];
            }
        } else fn = filename;


    }

    
}


/**
 * 输入类，用于处理键盘输入
 */
class Input {
    /** 空KEYDOWN数据 @type {object.<string, any>} */
    static __NULLKEYDOWN = {meta: null, ctrl: false, shift: false, keyCode: -1};
    /** 空KEYUP数据 @type {object.<string, any>} */
    static __NULLKEYUP = {meta: null, ctrl: false, shift: false, keyCode: -1};
    /** KEYDOWN数据 @type {object.<string, any>} */
    static __keyDown = Input.__deepCopy(Input.__NULLKEYDOWN);
    /** KEYUP数据 @type {object.<string, any>} */
    static __keyUp = Input.__deepCopy(Input.__NULLKEYUP);

    static getKeyDown() {
        let getKeyDownCheck = function(code) {
            if(Input.__keyDown.keyCode === code) return true;
            else return false;
        }

        let getKeyDownWithMeta = function() {
            let meta = Input.__keyDown;
            return meta;
        }

        if(arguments.length === 0) return getKeyDownWithMeta();
        else if(arguments.length === 1) return getKeyDownCheck(arguments[0]);
        else return false;
    }

    static getKeyUp() {
        let getKeyUpCheck = function(code) {
            if(Input.__keyUp.keyCode === code)                return true;
            else return false;
        }

        let getKeyUpWithMeta = function() {
            let meta = Input.__keyUp;
            return meta;
        }

        if(arguments.length === 0) return getKeyUpWithMeta();
        else if(arguments.length === 1) return getKeyUpCheck(arguments[0]);
        else return false;
    }

    static __keyDownHandle(event) {
        Input.__keyDown.meta = event;
        Input.__keyDown.ctrl = event.ctrlKey;
        Input.__keyDown.shift = event.shiftKey;
        Input.__keyDown.keyCode = event.code;
    }

    static __keyUpHandle(event) {
        Input.__keyUp.meta = event;
        Input.__keyUp.ctrl = event.ctrlKey;
        Input.__keyUp.shift = event.shiftKey;
        Input.__keyUp.keyCode = event.keyCode;
        Input.__keyUp.key = event.code;

    }

    static __deepCopy(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
    
        if (Array.isArray(obj)) {
            const arrCopy = [];
            for (let i = 0; i < obj.length; i++) {
                arrCopy[i] = Input.__deepCopy(obj[i]);
            }
            return arrCopy;
        }
    
        const objCopy = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                objCopy[key] = Input.__deepCopy(obj[key]);
            }
        }
        return objCopy;
    }
}


class CollisionBox {
    static _idCounter = 0; // 静态变量，用于生成唯一ID
    /**
     * 碰撞盒类，用于处理物体的碰撞检测
     * @param {number} x - 碰撞盒的 x 坐标
     * @param {number} y - 碰撞盒的 y 坐标
     * @param {number} width - 碰撞盒的宽度
     * @param {number} height - 碰撞盒的高度
     */
    constructor(x, y, width, height) {
        /** 碰撞箱x轴 @type {number} */
        this.x = x;
        /** 碰撞箱y轴 @type {number} */
        this.y = y;
        /** 碰撞箱宽度 @type {number} */
        this.width = width;
        /** 碰撞箱高度 @type {number} */
        this.height = height;

        /** 碰撞箱轴偏移 @type {number} */
        this.offset = {x: 0, y: 0, width: 0, height: 0};

        /** 进入碰撞箱的对象 @type {GameObject[]} */
        this.__enterObject = [];
        /** 是否是触发器 @type {boolean} */
        this.isTrigger = false;
        /** 父对象 @type {GameObject} */
        this.parentObject = null;
        /** debug组件 @type {object} */
        this.debug = {
            show: () => {this.__debug_show();},
            hide: () => {this.__debug_hide();},
            show_color: "lightgreen",
            hide_color: "red",
        };

        /** 是否绘制碰撞盒 @type {boolean} */
        this.__drawed_box = false;
        /** 是否隐藏碰撞盒 @type {boolean} */
        this.__hided_box = false;
        /** 碰撞箱ID @type {number} */
        this.id = CollisionBox._generateUniqueId(); // 为每个实例生成唯一ID
        this.show();
    }

    hide() {
        this.destory();
        this.__hided_box = true;
        if(this.__drawed_box) {
            this.__drawed_box = false;
            this.debug.show();
        }
    }

    show() {
        this.registerEvent();
    }

    /**
     * 生成唯一ID
     * @returns {number} - 唯一ID
     */
    static _generateUniqueId() {
        return CollisionBox._idCounter++;
    }

    /**
     * 启用调试模式，显示碰撞盒的边框
     */
    __debug_show() {
        if(this.__drawed_box) {
            engine.ctx.save();
            engine.ctx.strokeStyle = this.__hided_box ? this.debug.hide_color : this.debug.show_color;
            engine.ctx.lineWidth = 1;
            engine.ctx.strokeRect(this.x, this.y, this.width, this.height);
            engine.ctx.restore();
        } else {
            engine.registerEvent(`box${this.id} - debug show`, () => { this.__debug_show(); });
            this.__drawed_box = true;
        }
    }

    /**
     * 隐藏碰撞盒的边框
     * @returns {void}
     */
    __debug_hide() {
        engine.removeEvent(`box${this.id} - debug show`);
    }

    /**
     * 检测与另一个碰撞盒是否发生碰撞
     * @param {CollisionBox|CircleCollisionBox} box - 另一个碰撞盒实例
     * @returns {boolean} - 是否发生碰撞
     */
    isCollideWith(box) {
        if (box instanceof CircleCollisionBox) {
            return this.isCollideWithCircle(box); // 检测与圆形的碰撞
        } else {
            // 方形与方形的碰撞检测
            return this.isCollideWithLeft(box) && this.isCollideWithRight(box) 
                                               &&
                   this.isCollideWithTop(box) && this.isCollideWithBottom(box);
        }
    }

    isCollideWithLeft(box) {
        return this.x < box.x + box.width;   
    }
    isCollideWithRight(box) {
        return this.x + this.width > box.x;
    }
    isCollideWithTop(box) {
        return this.y < box.y + box.height;
    }
    isCollideWithBottom(box) {
        return this.y + this.height > box.y;
    }

    /**
     * 检测方形与圆形的碰撞
     * @param {CircleCollisionBox} circle - 圆形碰撞盒实例
     * @returns {boolean} - 是否发生碰撞
     */
    isCollideWithCircle(circle) {
        let circleDistanceX = Mathf.Abs(circle.x + circle.radius - (this.x + this.width / 2));
        let circleDistanceY = Mathf.Abs(circle.y + circle.radius - (this.y + this.height / 2));

        if (circleDistanceX > (this.width / 2 + circle.radius)) { return false; }
        if (circleDistanceY > (this.height / 2 + circle.radius)) { return false; }

        if (circleDistanceX <= (this.width / 2)) { return true; }
        if (circleDistanceY <= (this.height / 2)) { return true; }

        let cornerDistance_sq = (circleDistanceX - this.width / 2) ** 2 +
                                (circleDistanceY - this.height / 2) ** 2;

        return (cornerDistance_sq <= (circle.radius ** 2));
    }

    /**
     * 检测是否与某个点发生碰撞
     * @param {number} x - 点的 x 坐标
     * @param {number} y - 点的 y 坐标
     * @returns {boolean} - 是否发生碰撞
     */
    isCollideWithPoint(x, y) {
        return this.x < x && this.x + this.width > x && this.y < y && this.y + this.height > y;
    }

    /**
     * 检测当前碰撞盒是否与其他对象的碰撞盒发生碰撞，并触发相应的碰撞事件
     */
    __collideEvent() {
        const destoryedObjects = this.__enterObject.filter(obj => !engine.objects.includes(obj));
        // 合并摧毁的对象和当前对象
        const objects = destoryedObjects.concat(engine.objects);

        for(let object of objects) {
            if(object.collisionBox && object.collisionBox !== this) {
                if(this.isCollideWith(object.collisionBox) && !object.__destoryed) {
                    if(!this.__enterObject.includes(object)) {
                        this.__enterObject.push(object);
                        this.onCollisionEnter(object);
                    } else {
                        this.onCollisionStay(object);
                    }
                } else {
                    if(this.__enterObject.includes(object)) {
                        this.__enterObject.splice(this.__enterObject.indexOf(object), 1);
                        this.onCollisionExit(object);
                  }
                }
            }

            if(this.parentObject.__rigidbody) {
                if(object.collisionBox && object.collisionBox !== this && !object.__destoryed && !object.collisionBox.isTrigger) {
                    // 碰撞检测, 并根据碰撞方向禁止移动
                    if(this.isCollideWithBottom(object.collisionBox)) {
                        // 碰撞到底部后关闭重力 并设置y坐标
                        this.parentObject.y = object.collisionBox.y - this.parentObject.height + 1;
                        this.parentObject.DisableGravity();
                    } else {
                        if(this.parentObject.upForce > 0)
                            this.parentObject.EnableGravity();
                    }
                }
            }
        }
        
    }

    /**
     * 注册碰撞事件
     */
    registerEvent() {
        engine.registerEvent(`CollisionBox${this.id} - collistionEvent`, () => { this.__collideEvent(); });
    }

    /**
     * 销毁碰撞盒
     * @param {boolean} debug_hide - 是否隐藏碰撞盒的边框
     * @returns {void}
     */
    destory() {
        engine.removeEvent(`CollisionBox${this.id} - collistionEvent`);
        if(this.__drawed_box)
            this.debug.hide();
    }

    /**
     * 当碰撞开始时触发
     * @param {GameObject} other - 发生碰撞的另一个对象
     */
    onCollisionEnter(other) {}

    /**
     * 当碰撞持续时触发
     * @param {GameObject} other - 发生碰撞的另一个对象
     */
    onCollisionStay(other) { }

     /**
     * 当碰撞结束时触发
     * @param {GameObject} other - 发生碰撞的另一个对象
     */
    onCollisionExit(other) { }


}

/**
 * 圆形碰撞盒类，继承方形碰撞盒，扩展圆形检测功能
 */
class CircleCollisionBox extends CollisionBox {
    /**
     * 创建一个圆形碰撞盒实例
     * @param {number} x - 圆形碰撞盒的 x 坐标
     * @param {number} y - 圆形碰撞盒的 y 坐标
     * @param {number} radius - 圆形的半径
     */
    constructor(x, y, radius) {
        super(x, y, radius * 2, radius * 2); // 圆形的宽高等于直径
        this.radius = radius;
    }

    /**
     * 检测与另一个碰撞盒是否发生碰撞
     * @param {CollisionBox|CircleCollisionBox} box - 另一个碰撞盒实例
     * @returns {boolean} - 是否发生碰撞
     */
    isCollideWith(box) {
        if (box instanceof CircleCollisionBox) {
            // 圆形与圆形的碰撞检测
            let dx = (this.x + this.radius) - (box.x + box.radius);
            let dy = (this.y + this.radius) - (box.y + box.radius);
            let distance = Mathf.Sqrt(dx * dx + dy * dy);
            return distance < this.radius + box.radius;
        } else if (box instanceof CollisionBox) {
            // 圆形与方形的碰撞检测
            let circleDistanceX = Mathf.Abs((this.x + this.radius) - (box.x + box.width / 2));
            let circleDistanceY = Mathf.Abs((this.y + this.radius) - (box.y + box.height / 2));

            if (circleDistanceX > (box.width / 2 + this.radius)) { return false; }
            if (circleDistanceY > (box.height / 2 + this.radius)) { return false; }

            if (circleDistanceX <= (box.width / 2)) { return true; }
            if (circleDistanceY <= (box.height / 2)) { return true; }

            let cornerDistance_sq = (circleDistanceX - box.width / 2) ** 2 +
                                    (circleDistanceY - box.height / 2) ** 2;

            return (cornerDistance_sq <= (this.radius ** 2));
        } else {
            // 如果遇到未知类型，返回 false
            return false;
        }
    }

    isCollideWithLeft(box) {
        return this.x - this.radius < box.x + box.width;
    }

    isCollideWithRight(box) {
        return this.x + this.radius > box.x;
    }

    isCollideWithTop(box) {
        return this.y - this.radius < box.y + box.height;
    }

    isCollideWithBottom(box) {
        return this.y + this.radius > box.y;
    }

    /**
     * 检测圆形是否与某个点发生碰撞
     * @param {number} x - 点的 x 坐标
     * @param {number} y - 点的 y 坐标
     * @returns {boolean} - 是否发生碰撞
     */
    isCollideWithPoint(x, y) {
        let dx = (this.x + this.radius) - x;
        let dy = (this.y + this.radius) - y;
        return Mathf.Sqrt(dx * dx + dy * dy) < this.radius;
    }

    /**
     * 启用调试模式，显示圆形碰撞盒的边框
     */
    __debug_show() {
        if (this.__drawed_box) {
            engine.ctx.save();
            engine.ctx.strokeStyle = this.__hided_box ? this.debug.hide_color : this.debug.show_color;
            engine.ctx.lineWidth = 1;
            engine.ctx.beginPath();
            engine.ctx.arc(this.x + this.radius, this.y + this.radius, this.radius, 0, 2 * Mathf.PI);
            engine.ctx.stroke();
            engine.ctx.restore();
        } else {
            engine.registerEvent(`circle${this.id} - debug show`, () => { this.__debug_show(); });
            this.__drawed_box = true;
        }
    }

    /**
     * 隐藏圆形碰撞盒的边框
     * @returns {void}
     */
    __debug_hide() {
        engine.removeEvent(`circle${this.id} - debug show`);
    }
}


class GameObject {
    static OBJECT_ID = 0; // 静态变量，用于生成唯一ID
    /**
     * 游戏对象类，表示游戏中的一个对象
     * @param {Image|null} image - 对象的图像
     * @param {number} width - 对象的宽度
     * @param {number} height - 对象的高度
     * @param {boolean} visible - 对象是否可见
     */
    constructor(image = null, x = 0, y = 0, width = 100, height = 100, visible = true) {
        /** 对象的名称 @type {string} */
        this.name = null;
        /** 对象的 x 坐标 @type {number} */
        this._x = x;
        /** 对象的 y 坐标 @type {number} */
        this._y = y;
        /** 对象的标签 @type {string} */
        this.tag = "";
        /** 对象的图像 @type {Image|null} */
        this.image = image;
        /** 对象的文本 @type {string|null} */
        this.text = null;
        /** 文本样式 @type {object.<string, string>} */
        this.style = {"font": "30px Arial", "color": "black"};
        /** 对象的旋转角度 @type {number} */
        this.rotation = 0;
        /** 对象的滑动比例 @type {object.<string, number>} */
        this.slider = {x: 1, y: 1};
        /** 对象的宽度 @type {number} */
        this.width = width;
        /** 对象的高度 @type {number} */
        this.height = height;
        /** 对象是否可见 @type {boolean} */
        this.visible = visible;
        /** 对象的透明度 @type {number} */
        this.opacity = 1;
        /** 碰撞盒 @type {CollisionBox||CircleCollisionBox} */
        this.collisionBox = null;
        /** 子对象 @type {GameObject[]} */
        this.childs = [];
        /** 父对象 @type {GameObject} */
        this.parent = null;
        /** 对象的ID @type {number} */
        this.id = GameObject.OBJECT_ID++;
        /** 对象的绘制图层 @type {number} */
        this.order = engine.objects.length;
        /** 是否翻转 @type {object.<string, boolean>} */
        this.flip = {x: false, y: false};

        /** 是否启用刚体 @type {boolean} */
        this.__rigidbody = false;
        /** 是否已被销毁 @type {boolean} */
        this.__destoryed = false;

        /** 重力 @type {number} */
        this.gravity = 5;
        /** 上升力 @type {number} */
        this.upForce = 0;
        /** 重力事件状态 @type {string} */
        this.__gravityEventState = "disable";
        
        engine.objects.push(this);
    }

    gravityUpdate() {
        // 如果upForce小于0，则设置upFrce为0
        this.upForce = Mathf.Max(this.upForce, 0);
        // GDT = 重力 * 时间差 * 100
        const GDT = this.gravity * engine.deltaTime * 100;
        // y轴坐标增加GDT - upForce, 增加代表下坠
        this.y += GDT - this.upForce;
        for(let obj of engine.objects) {
            if(obj.collisionBox && obj.collisionBox !== this.collisionBox) {
                if(this.collisionBox.isCollideWithBottom(obj.collisionBox)) {
                    this.y -= GDT - this.upForce;
                    this.y = obj.collisionBox.y - this.height + 1;
                    this.DisableGravity();
                }
            }
        }
        // 如果upForce大于0，则减少upForce
        if(this.upForce > 0)
            this.upForce -= GDT / 50;
    }

    EnableGravity() {
        if(this.__gravityEventState === "enable") return;
        this.__gravityEventState = "enable";
        engine.registerEvent(`GameObjectGravity${this.id}`, () => { this.gravityUpdate(); });

    }
    DisableGravity() {
        if(this.__gravityEventState === "disable") return;
        this.__gravityEventState = "disable";
        engine.removeEvent(`GameObjectGravity${this.id}`);
    }

    set rigidbody(value) {
        if(value) {
            this.__rigidbody = true;
            this.EnableGravity();
        }
        else {
            this.DisableGravity();
            this.upForce = 0;
            engine.removeEvent(`GameObjectGravity${this.id}`);
            this.__rigidbody = false;
        }
    }

    /**
     * 获取对象的 x 坐标
     * @returns {number} - x 坐标
     */
    get x() { return this._x; }

    /**
     * 获取对象的 y 坐标
     * @returns {number} - y 坐标
     */
    get y() { return this._y; }

    /**
     * 设置对象的 x 坐标，并同步更新碰撞盒的 x 坐标
     * @param {number} x - 新的 x 坐标
     */
    set x(x) { 
        this._x = x; 
        if(this.collisionBox) { 
            this.collisionBox.x = this._x + (this.collisionBox.offset.x || 0); 
        }
        for(let child of this.childs) 
            child.collisionBox.x = child.x + child.collisionBox.offset.x;
    }

    /**
     * 设置对象的 y 坐标，并同步更新碰撞盒的 y 坐标
     * @param {number} y - 新的 y 坐标
     */
    set y(y) {
        this._y = y;
        if(this.collisionBox) {
            this.collisionBox.y = this._y + (this.collisionBox.offset.y || 0);
        }
        for(let child of this.childs) 
            child.collisionBox.y = child.y + child.collisionBox.offset.y;
    }

    /**
     * 设置对象的位置
     * @param {GameObject} - 子对象
     */
    setChild(child) {
        child.parent = this;
        this.childs.push(child);
    }

    /**
     * 创建一个碰撞盒
     * @param {number} offsetX - 碰撞盒的 x 偏移量
     * @param {number} offsetY - 碰撞盒的 y 偏移量
     * @param {number} offsetWidth - 碰撞盒的宽度偏移量
     * @param {number} offsetHeight - 碰撞盒的高度偏移量
     */
    createCollisionBox(offsetX = 0, offsetY = 0, offsetWidth = 0, offsetHeight = 0) {
        this.collisionBox = new CollisionBox(this.x + offsetX, this.y + offsetY, this.width + offsetWidth, this.height + offsetHeight);
        this.collisionBox.offset = {x: offsetX, y: offsetY};
        this.collisionBox.offsetHeight = offsetHeight;
        this.collisionBox.offsetWidth = offsetWidth;
        this.collisionBox.parentObject = this;
    }

    /**
     * 创建一个圆形碰撞盒
     * @param {number} radius - 圆形碰撞盒的半径
     * @param {number} offsetX - 圆形碰撞盒的 x 偏移量
     * @param {number} offsetY - 圆形碰撞盒的 y 偏移量
     * @returns {void}
     */
    createCircleCollisionBox(radius, offsetX = 0, offsetY = 0) {
        this.collisionBox = new CircleCollisionBox(this._x + offsetX, this._y + offsetY, radius);
        this.collisionBox.offset.x = offsetX; // 保存偏移量，便于后续更新时使用
        this.collisionBox.offset.y = offsetY;
        this.collisionBox.parentObject = this;
    }

    /**
     * 销毁碰撞盒
     * @returns {void}
     */
    destoryCollisionBox() {
        this.collisionBox.destory();
    }

    /**
     * 设置对象的透明度，这个函数会递归设置子对象的透明度- 
     * @param {number} opacity - 新的透明度值 (0-1)
     */
    setOpacity(opacity) {
        this.opacity = opacity;
        for(let child of this.childs) {
            child.setOpacity(opacity);
        }
    }

    /**
     * 设置对象的滑动效果比例
     * @param {number} slider - 滑动比例 (0-1)
     */
    setSliderX(slider) {
        this.slider.x = slider;
    }

    /**
     * 设置对象的滑动效果比例
     * @param {number} slider - 滑动比例 (0-1)
     * @returns {void}
     */
    setSliderY(slider) {
        this.slider.y = slider;
    }

    /**
     * 创建对象
     * @param {string} imgName - 图片名称
     * @param {number} x - x 坐标
     * @param {number} y - y 坐标
     * @param {number} width - 对象的宽度
     * @param {number} height - 对象的高度
     * @param {boolean} visible - 是否可见
     * @returns {GameObject} - 创建的对象
     */
    static create(imgName, x, y, width, height, visible = true) {
        let image = engine.getImage(imgName);
        if(image === null)
            console.error(`didn't find image: ${imgName}, please preload it first`);
            // if image not loaded, return null image object
        let object = new GameObject(image, x, y, width, height);
        object.visible = visible;
        return object;
    }

    /**
     * 查找并更新对象的图像
     */
    findImage() {
        if(typeof this.image === "string") {
            this.image = engine.getImage(this.image);
        }
    }

    /**
     * 销毁对象
     * @param {GameObject} object - 要销毁的对象
     */
    static destory(object) {
        let index = engine.objects.indexOf(object);
        if(index !== -1){
            engine.objects.splice(index, 1);
        } else {
            console.warn("Object not found");
        }
        object.collisionBox && object.collisionBox.destory();
        object.__destoryed = true;
    }

    /**
     * 根据对象名称销毁对象
     * @param {string|null} name - 对象名称
     */
    static destoryWithName(name) {
        if(name === null) { 
            console.error("Name is null"); 
            return; 
        }
        for(let i = 0; i < engine.objects.length; i++) {
            if(engine.objects[i].name === name) {
                engine.objects[i].collisionBox && engine.objects[i].collisionBox.destory();
                engine.objects.splice(i, 1);
                return;
            }
        }
    }

    /**
     * 销毁当前对象
     */
    destory() { GameObject.destory(this); }
    copy() {
        const deepClone = (obj, seen = new Map()) => {
            if (obj === null || typeof obj !== "object") {
                return obj;
            }

            if (seen.has(obj)) {
                return seen.get(obj);
            }

            const clone = Array.isArray(obj) ? [] : Object.create(Object.getPrototypeOf(obj));
            seen.set(obj, clone);

            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clone[key] = deepClone(obj[key], seen);
                }
            }

            return clone;
        };

        return deepClone(this);
    }

    update() {} // 抽象方法，子类需实现
    onMouseDown() {} // 抽象方法，子类需实现
    onMouseUp() {} // 抽象方法，子类需实现
    onMouseMove() {} // 抽象方法，子类需实现

    /**
     * 设置对象的位置
     * @param {number} x - x 坐标
     * @param {number} y - y 坐标
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
}

class PreloadAnimation {
    /**
     * 预加载动画类，用于预加载动画帧
     * @param {string} _class - 动画所属的类名
     * @param {string} name - 动画名称
     * @param {string[]} imgs - 动画帧的图像数组
     * @param {function|null} callback - 动画加载完成后的回调函数
     */
    constructor(_class, name, imgs, callback) {
        this.frames = new Array(imgs.length);
        imgs.forEach((imageSrc, i) => {
            engine.preload(imageSrc).then(
                img => {
                    this.frames[i] = img;
                    callback && callback();
                }
            ).catch(err => console.error(err));
        });

        if(engine.__animations[_class] === undefined) {
            engine.__animations[_class] = {};
        }
        engine.__animations[_class][name] = this;
    }

    animation(speed) {
        return new Animation(this.frames, speed);
    }
}


class Animation {
    /**
     * 动画类，处理对象的动画效果，你不应该直接实例化这个类，而是使用 PreloadAnimation 类来加载动画，然后通过 engine.getAnimation('classes', 'name').animation() 方法来获取动画对象
     * @param {Image[]} frames - 动画帧的图像数组
     */
    constructor(frames, speed = 1) {
        this.frames = frames
        this.curframe = 0;
        this.framesCount = 0;
        this.speed = speed;
        /** @type {GameObject} */
        this.__object__ = null;

        // {condition: function, anim: Animation, valueName: string}
        this.next = [];

        this.loop = true;
        this.event = {};
    }

    // test function dont use this
    addEvent(frameIndex, callback) {
        this.event[frameIndex] = callback;
    }
    /**
     * 销毁动画对象 
     * @returns {void}
     */
    destory() {
        this.__object__ && this.__object__.destory();
    }
    
    /**
     * 绘制动画帧
     * @param {number} width - 动画对象的宽度
     * @param {number} height - 动画对象的高度
     * @param {boolean} visible - 是否可见
     */
    create(width, height, visible = true) {
        this.__object__ = new GameObject(this.frames[0], 0, 0, width, height, visible);
        this.__object__.tag = "animation";
        this.__object__.update = () => {
            this.framesCount++;
            // 8 帧更新一次
            const framesToUpdate = Mathf.Floor(8 / this.speed);
            if(this.framesCount >= framesToUpdate) {
                this.framesCount = 0;
                this.curframe++;
                if(this.curframe >= this.frames.length) {
                    if(this.loop) this.curframe = 0;
                    else this.curframe = this.frames.length - 1;
                }
            }
            
            if(this.curframe in this.event) {
                this.event[this.curframe]();
            }
            
            if(this.curframe === undefined) {
                console.error("curframe is undefined");
                return;
            };
            this.__object__.image = this.frames[this.curframe];

            this.update();
        }
    }

    /**
     * 更新动画帧
     */
    update() { }

    /**
     * 设置动画对象的位置
     * @param {number} x - x 坐标
     * @param {number} y - y 坐标
     */
    setPosition(x, y) {
        this.__object__.setPosition(x, y);
    }
}


class Animator extends GameObject {
    /**
     * 动画控制器类，用于管理多个动画之间的切换
     * @param {Animation[]} animations - 动画对象集合
     * @param {number} x - x 坐标
     * @param {number} y - y 坐标
     * @param {number} w - 宽度
     * @param {number} h - 高度
     * @param {boolean} v - 是否可见
     */
    constructor(animations, x, y, w, h, v) {
        super(null, w, h, v);

        this.x = x;
        this.y = y;
        // {name: Animation}
        this.animations = animations;

        // should be a Name!!
        this.current = null;
        this.enter = null;
        // {anim: Animation, condition: function, valueName: string, callback: function}
        this.exit = null;

        // {name: value}
        this.values = {};

        this.excess = false;

        this.__animationChanged = true;
        engine.registerEvent(`Animator${this.id}`, () => { this.__animator_update(); });

    }

    /**
     * 连接两个动画，并设置切换条件
     * @param {string} anim1 - 起始动画
     * @param {string} anim2 - 目标动画
     * @param {function} condition - 动画切换条件, 返回值为 boolean
     * @param {boolean} excess - 是否保留多余的帧
     * @param {function|null} callback - 动画切换后的回调函数
     */
    connect(anim1, anim2, condition, excess = false, callback = null) {
        this.animations[anim1].next.push({"anim": this.animations[anim2], "condition": condition, "excess": excess, "callback": callback});
    }

    /**
     * 设置动画控制器的变量值
     * @param {string} valueName - 变量名
     * @param {any} value - 变量值
     */
    setValue(valuenName, value) {
        this.values[valuenName] = value;
    }

    /**
     * 获取动画控制器的变量值
     * @param {string} valueName - 变量名
     * @returns {any} - 变量值
     */
    getValue(valuenName) {
        return this.values[valuenName];
    }

    /**
     * 更新动画状态并处理动画切换
     */
    __animator_update() {
        if(!this.current) {
            this.current = this.animations[this.enter];
            this.__animationChanged = true;
            if(!this.current) console.error("Enter animation not found");
        }

        this.current.__object__ && !this.current.__object__.parent && 
            this.setChild(this.current.__object__);

        for(let next of this.current.next) {
            if(next.condition(this.values)) {
                this.current.destory();
                
                let ratio = this.current.curframe / this.current.frames.length;
                this.current = next.anim;

                if(next.excess)
                    this.current.curframe = Mathf.Floor(ratio * this.current.frames.length);
                next.callback && next.callback();

                this.__animationChanged = true;
                return this.__animator_update();
            }
        }

        if(this.exit && this.exit.condition(this.values[this.exit.valueName])) {
            this.current = this.exit.anim;
            this.exit.callback && this.exit.callback();
        }

        if(this.__animationChanged) {
            this.current.create(this.width, this.height, this.visible);
            this.current.setPosition(this.x, this.y);
            this.__animationChanged = false;
        }
    }

    /**
     * 获取所有动画的帧数总和
     * @returns {number} - 动画帧数
     */
    getFrameLength() {
        let sum = 0;
        for(let anim in this.animations)
            sum += anim.frames.length;
        return sum;
    }

    /**
     * 销毁动画控制器
     * @returns {void}
     */
    destory() {
        // for(let anim of Object.values(this.animations)) {
        //     anim.destory();
        // }
        this.current.destory();
        engine.removeEvent(`Animator${this.id}`);
        super.destory();
    }
}


class Button extends GameObject {
    /**
     * 按钮类，用于处理按钮点击事件
     * @param {Image} image - 按钮的图像
     * @param {number} x - x 坐标
     * @param {number} y - y 坐标
     * @param {number} width - 按钮的宽度
     * @param {number} height - 按钮的高度
     * @param {function} callback - 按钮点击时的回调函数
     */
    constructor(image, x, y, width, height, callback) {
        super(image, width, height);
        this.x = x;
        this.y = y;
        this.clickBox = new CollisionBox(x, y, width, height);
        this.callback = callback;
    }

    /**
     * 处理鼠标按下事件，判断是否点击在按钮上，并触发回调函数
     * @param {number} x - 鼠标的 x 坐标
     * @param {number} y - 鼠标的 y 坐标
     */
    onMouseDown(x, y) {
        this.clickBox.isCollideWithPoint(x, y) && this.callback && this.callback();
    }
}

/**
 * 数学工具类
 */
class Mathf {
    /** 
     * 数学圆周率常量
     * @type {number}
    */
    static PI = Math.PI;
    /**
     * 计算两点之间的距离
     * @param {number} x1 - 第一个点的x坐标
     * @param {number} y1 - 第一个点的y坐标
     * @param {number} x2 - 第二个点的x坐标
     * @param {number} y2 - 第二个点的y坐标
     * @returns {number} - 两点之间的距离
     */
    static Distance(x1, y1, x2, y2) {
        return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
    }

    /**
     * 计算从点(x1, y1)到点(x2, y2)的方向向量
     * @param {number} x1 - 第一个点的x坐标
     * @param {number} y1 - 第一个点的y坐标
     * @param {number} x2 - 第二个点的x坐标
     * @param {number} y2 - 第二个点的y坐标
     * @returns {number[]} - 方向向量 [cos(angle), sin(angle)]
     */
    static Direction(x1, y1, x2, y2) {
        let angle = Math.atan2(y2 - y1, x2 - x1);
        return [Math.cos(angle), Math.sin(angle)];
    }

    /**
     * 生成指定范围内的随机数
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} - 随机数
     */
    static Random(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * 生成指定范围内的随机整数
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} - 随机整数
     */
    static RandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * 从数组中随机选择一个元素
     * @param {any[]} arr - 数组
     * @returns {any} - 随机选择的元素
     */
    static RandomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /**
     * 生成随机RGB颜色
     * @returns {string} - RGB颜色字符串
     */
    static RandomColor() {
        return `rgb(${Mathf.RandomInt(0, 255)}, ${Mathf.RandomInt(0, 255)}, ${Mathf.RandomInt(0, 255)})`;
    }

    /**
     * 生成随机RGBA颜色
     * @returns {string} - RGBA颜色字符串
     */
    static RandomColorAlpha() {
        return `rgba(${Mathf.RandomInt(0, 255)}, ${Mathf.RandomInt(0, 255)}, ${Mathf.RandomInt(0, 255)}, ${Mathf.Random(0, 1)})`;
    }

    /**
     * 生成固定透明度的随机RGBA颜色
     * @returns {string} - RGBA颜色字符串
     */
    static RandomColorAlphaFixed() {
        return `rgba(${Mathf.RandomInt(0, 255)}, ${Mathf.RandomInt(0, 255)}, ${Mathf.RandomInt(0, 255)}, 0.5)`;
    }

    /**
     * 线性插值
     * @param {number} a - 起始值
     * @param {number} b - 结束值
     * @param {number} t - 插值参数 (0 <= t <= 1)
     * @returns {number} - 插值结果
     */
    static Lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * 将值限制在指定范围内
     * @param {number} value - 要限制的值
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} - 限制后的值
     */
    static Clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * 将值从一个范围映射到另一个范围
     * @param {number} value - 要映射的值
     * @param {number} start1 - 原始范围的起始值
     * @param {number} stop1 - 原始范围的结束值
     * @param {number} start2 - 目标范围的起始值
     * @param {number} stop2 - 目标范围的结束值
     * @returns {number} - 映射后的值
     */
    static Map(value, start1, stop1, start2, stop2) {
        return (value - start1) / (stop1 - start1) * (stop2 - start2) + start2;
    }

    /**
     * 计算值的绝对值
     * @param {number} value - 要计算的值
     * @returns {number} - 绝对值
     */
    static Abs(value) {
        return Math.abs(value);
    }

    /**
     * 将值从一个范围映射到另一个范围，并限制在目标范围内
     * @param {number} value - 要映射的值
     * @param {number} start1 - 原始范围的起始值
     * @param {number} stop1 - 原始范围的结束值
     * @param {number} start2 - 目标范围的起始值
     * @param {number} stop2 - 目标范围的结束值
     * @returns {number} - 映射并限制后的值
     */
    static MapClamp(value, start1, stop1, start2, stop2) {
        return Mathf.Clamp(Mathf.Map(value, start1, stop1, start2, stop2), start2, stop2);
    }

    /**
     * 计算两点之间的角度（以度为单位）
     * @param {number} x1 - 第一个点的x坐标
     * @param {number} y1 - 第一个点的y坐标
     * @param {number} x2 - 第二个点的x坐标
     * @param {number} y2 - 第二个点的y坐标
     * @returns {number} - 角度（度）
     */
    static Angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    }

    /**
     * 将角度转换为方向向量
     * @param {number} angle - 角度（度）
     * @returns {number[]} - 方向向量 [cos(angle), sin(angle)]
     */
    static AngleToDirection(angle) {
        return [Math.cos(angle * Math.PI / 180), Math.sin(angle * Math.PI / 180)];
    }

    /**
     * 将方向向量转换为角度
     * @param {number[]} direction - 方向向量 [x, y]
     * @returns {number} - 角度（度）
     */
    static DirectionToAngle(direction) {
        return Math.atan2(direction[1], direction[0]) * 180 / Math.PI;
    }

    /**
     * 生成随机方向向量
     * @returns {number[]} - 随机方向向量 [cos(angle), sin(angle)]
     */
    static RandomDirection() {
        let angle = Mathf.Random(0, 360);
        return [Math.cos(angle * Math.PI / 180), Math.sin(angle * Math.PI / 180)];
    }

    /**
     * 生成随机方向向量（弧度）
     * @returns {number[]} - 随机方向向量 [cos(angle), sin(angle)]
     */
    static RandomDirection2() {
        let angle = Mathf.Random(0, 2 * Math.PI);
        return [Math.cos(angle), Math.sin(angle)];
    }

    /**
     * 将数值四舍五入到指定的小数位数
     * @param {number} value - 要四舍五入的数值
     * @param {number} precision - 小数位数
     * @returns {number} - 四舍五入后的数值
     */
    static Round(value, precision) {
        let multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    }

    /**
     * 计算值的平方根
     * @param {number} value - 要计算的值
     * @returns {number} - 平方根
     */
    static Sqrt(value) {
        return Math.sqrt(value);
    }

    /**
     * 计算值的平方
     * @param {number} value - 要计算的值
     * @returns {number} - 平方
     */
    static Pow(value, exponent) {
        return Math.pow(value, exponent);
    }

    /**
     * 计算值的正弦
     * @param {number} value - 要计算的值（弧度）
     * @returns {number} - 正弦值
     */
    static Sin(value) {
        return Math.sin(value);
    }

    /**
     * 计算值的余弦
     * @param {number} value - 要计算的值（弧度）
     * @returns {number} - 余弦值
     */
    static Cos(value) {
        return Math.cos(value);
    }

    /**
     * 计算值的正切
     * @param {number} value - 要计算的值（弧度）
     * @returns {number} - 正切值
     */
    static Tan(value) {
        return Math.tan(value);
    }

    /**
     * 计算值的反正弦
     * @param {number} value - 要计算的值
     * @returns {number} - 反正弦值（弧度）
     */
    static Asin(value) {
        return Math.asin(value);
    }

    /**
     * 计算值的反余弦
     * @param {number} value - 要计算的值
     * @returns {number} - 反余弦值（弧度）
     */
    static Acos(value) {
        return Math.acos(value);
    }

    /**
     * 计算值的反正切
     * @param {number} value - 要计算的值
     * @returns {number} - 反正切值（弧度）
     */
    static Atan(value) {
        return Math.atan(value);
    }

    /**
     * 计算两个值的反正切
     * @param {number} y - y值
     * @param {number} x - x值
     * @returns {number} - 反正切值（弧度）
     */
    static Atan2(y, x) {
        return Math.atan2(y, x);
    }

    /**
     * 计算值的自然对数
     * @param {number} value - 要计算的值
     * @returns {number} - 自然对数
     */
    static Log(value) {
        return Math.log(value);
    }

    /**
     * 计算值的以10为底的对数
     * @param {number} value - 要计算的值
     * @returns {number} - 以10为底的对数
     */
    static Log10(value) {
        return Math.log10(value);
    }

    /**
     * 计算值的以2为底的对数
     * @param {number} value - 要计算的值
     * @returns {number} - 以2为底的对数
     */
    static Log2(value) {
        return Math.log2(value);
    }

    /**
     * 计算值的指数
     * @param {number} value - 要计算的值
     * @returns {number} - 指数
     */
    static Exp(value) {
        return Math.exp(value);
    }

    /**
     * 计算值的符号
     * @param {number} value - 要计算的值
     * @returns {number} - 符号（-1, 0, 1）
     */
    static Sign(value) {
        return Math.sign(value);
    }

    /**
     * 计算值的向上取整
     * @param {number} value - 要计算的值
     */
    static Floor(value) {
        return Math.floor(value);
    }

    /**
     * 计算值的最大值
     * @param {...number} values - 要计算的值
     * @returns {number} - 最大值
     */
    static Max(...values) {
        return Math.max(...values);
    }

    /**
     * 计算值的最小值
     * @param {...number} values - 要计算的值
     * @returns {number} - 最小值
     */
    static Min(...values) {
        return Math.min(...values);
    }

    /**
     * 向量操作子类
     */
    static Vector = class {
        /**
         * 向量加法
         * @param {number[]} v1 - 向量1
         * @param {number[]} v2 - 向量2
         * @returns {number[]} - 结果向量
         */
        static Add(v1, v2) {
            return [v1[0] + v2[0], v1[1] + v2[1]];
        }

        /**
         * 向量减法
         * @param {number[]} v1 - 向量1
         * @param {number[]} v2 - 向量2
         * @returns {number[]} - 结果向量
         */
        static Subtract(v1, v2) {
            return [v1[0] - v2[0], v1[1] - v2[1]];
        }

        /**
         * 向量点积
         * @param {number[]} v1 - 向量1
         * @param {number[]} v2 - 向量2
         * @returns {number} - 点积结果
         */
        static Dot(v1, v2) {
            return v1[0] * v2[0] + v1[1] * v2[1];
        }

        /**
         * 向量叉积
         * @param {number[]} v1 - 向量1
         * @param {number[]} v2 - 向量2
         * @returns {number} - 叉积结果
         */
        static Cross(v1, v2) {
            return v1[0] * v2[1] - v1[1] * v2[0];
        }

        /**
         * 计算向量长度
         * @param {number[]} v - 向量
         * @returns {number} - 向量长度
         */
        static Length(v) {
            return Math.sqrt(v[0] ** 2 + v[1] ** 2);
        }

        /**
         * 向量归一化
         * @param {number[]} v - 向量
         * @returns {number[]} - 归一化后的向量
         */
        static Normalize(v) {
            let length = Mathf.Vector.Length(v);
            return [v[0] / length, v[1] / length];
        }
    }
}

/**
 * 键盘按键码
 */
class KeyCode {
    /** a键 @type {string} */
    static A = "KeyA";
    /** b键 @type {string} */
    static B = "KeyB";
    /** c键 @type {string} */
    static C = "KeyC";
    /** d键 @type {string} */
    static D = "KeyD";
    /** e键 @type {string} */
    static E = "KeyE";
    /** f键 @type {string} */
    static F = "KeyF";
    /** g键 @type {string} */
    static G = "KeyG";
    /** h键 @type {string} */
    static H = "KeyH";
    /** i键 @type {string} */
    static I = "KeyI";
    /** j键 @type {string} */
    static J = "KeyJ";
    /** k键 @type {string} */
    static K = "KeyK";
    /** l键 @type {string} */
    static L = "KeyL";
    /** m键 @type {string} */
    static M = "KeyM";
    /** n键 @type {string} */
    static N = "KeyN";
    /** o键 @type {string} */
    static O = "KeyO";
    /** p键 @type {string} */
    static P = "KeyP";
    /** q键 @type {string} */
    static Q = "KeyQ";
    /** r键 @type {string} */
    static R = "KeyR";
    /** s键 @type {string} */
    static S = "KeyS";
    /** t键 @type {string} */
    static T = "KeyT";
    /** u键 @type {string} */
    static U = "KeyU";
    /** v键 @type {string} */
    static V = "KeyV";
    /** w键 @type {string} */
    static W = "KeyW";
    /** x键 @type {string} */
    static X = "KeyX";
    /** y键 @type {string} */
    static Y = "KeyY";
    /** z键 @type {string} */
    static Z = "KeyZ";

    /** 0键 @type {string} */
    static Num0 = "Digit0";
    /** 1键 @type {string} */
    static Num1 = "Digit1";
    /** 2键 @type {string} */
    static Num2 = "Digit2";
    /** 3键 @type {string} */
    static Num3 = "Digit3";
    /** 4键 @type {string} */
    static Num4 = "Digit4";
    /** 5键 @type {string} */
    static Num5 = "Digit5";
    /** 6键 @type {string} */
    static Num6 = "Digit6";
    /** 7键 @type {string} */
    static Num7 = "Digit7";
    /** 8键 @type {string} */
    static Num8 = "Digit8";
    /** 9键 @type {string} */
    static Num9 = "Digit9";

    /** 空格键 @type {string} */
    static Space = "Space";
    /** 回车键 @type {string} */
    static Enter = "Enter";
    /** Tab键 @type {string} */
    static Tab = "Tap";
    /** Esc键 @type {string} */
    static Escape = "Escape";
    /** Backspace键 @type {string} */
    static Backspace = "Backspace";
    /** CapsLock键 @type {string} */
    static CapsLock = "CapsLock";
    /** Delete键 @type {string} */
    static Delete = "Delete";
    /** End键 @type {string} */
    static End = "End";
    /** Home键 @type {string} */
    static Home = "Home";

    /** 左方向键 @type {string} */
    static ArrowLeft = "ArrowLeft";
    /** 上方向键 @type {string} */
    static ArrowUp = "ArrowUp";
    /** 右方向键 @type {string} */
    static ArrowRight = "ArrowRight";
    /** 下方向键 @type {string} */
    static ArrowDown = "ArrowDown";

    /** F1键 @type {string} */
    static F1 = "F1";
    /** F2键 @type {string} */
    static F2 = "F2";
    /** F3键 @type {string} */
    static F3 = "F3";
    /** F4键 @type {string} */
    static F4 = "F4";
    /** F5键 @type {string} */
    static F5 = "F5";
    /** F6键 @type {string} */
    static F6 = "F6";
    /** F7键 @type {string} */
    static F7 = "F7";
    /** F8键 @type {string} */
    static F8 = "F8";
    /** F9键 @type {string} */
    static F9 = "F9";
    /** F10键 @type {string} */
    static F10 = "F10";
    /** F11键 @type {string} */
    static F11 = "F11";
    /** F12键 @type {string} */
    static F12 = "F12";
}

/**
 * 游戏引擎实例，全局唯一
 * @type {GameEngine}
 */
const engine = new GameEngine();