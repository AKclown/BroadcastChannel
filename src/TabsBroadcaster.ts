import { v4 as uuidv4 } from 'uuid';
export interface IAgentUser {
  id: string;
  time: number;
}

class TabsBroadcaster {
  private name: string;
  private channel: BroadcastChannel;
  private _timeout: number;
  private _messageId: number;
  private _messages: Array<TaskItem>;
  private _filter?: (item: any) => boolean;

  constructor(name: string, timeout = 2000) {
    this.name = name;
    this._messageId = 0;
    // 浏览器断线之后，照常通信
    this.channel = new BroadcastChannel(name);
    this.channel.onmessage = (event) => this.receive(event);
    this._messages = [];
    this._timeout = timeout;
  }
  public setFilter(filter: (item: any) => boolean) {
    this._filter = filter;
  }
  public send(content: any, timeout?: number): Promise<any> {
    const id = uuidv4();
    const task = new TaskItem(id, timeout || this._timeout);
    const promise = new Promise((resolve, reject) => {
      task._reject = reject;
      task._resolve = resolve;
    });
    this._messages.push(task);
    this.channel.postMessage({
      id,
      type: 'request',
      payload: content,
    });
    return promise;
  }
  private answer(messageId: number, content: any) {
    this.channel.postMessage({
      id: messageId,
      type: 'response',
      payload: content,
    });
  }
  private receive(event: MessageEvent) {
    const data = event.data;
    if (data.type === 'request') {
      if (!this._filter || this._filter(data.payload)) {
        this.answer(data.id, { active: true });
      }
    } else if (data.type === 'response') {
      const task = this._messages.find((msg) => msg.id === data.id);
      // $ task可能不存在（不是这个tabs的相关响应）
      task?.reject(data.payload);
    }
  }
}
class TaskItem {
  public _resolve!: (value: unknown) => void;
  public _reject!: (reason?: any) => void;
  private _interval;
  public id: string;
  constructor(id: string, timeout: number) {
    this.id = id;
    this._interval = setTimeout(
      () => this.resolve({ active: false, reason: 'timeout, no one uses it' }),
      timeout,
    );
  }
  public resolve(value: unknown) {
    clearTimeout(this._interval);
    this._resolve(value);
  }
  public reject(reason?: any) {
    this._reject(reason);
  }
}

let currentAgentUserId: string;
let broadcaster: TabsBroadcaster | undefined;
async function findAvailableAgentUser(): Promise<IAgentUser | undefined> {
  if (!broadcaster) broadcaster = new TabsBroadcaster('AKclown', 200);
  currentAgentUserId = '';
  broadcaster.setFilter((item) => {
    return item.id === currentAgentUserId;
  });
  const agentUsers: Array<IAgentUser> =
    JSON.parse(localStorage.getItem(`agentUsers`) || '[]') || [];

  const requests: Promise<IAgentUser | undefined>[] = [];
  for (const item of agentUsers) {
    const response = broadcaster.send(item).then(() => {
      if (currentAgentUserId === '') {
        item.time = new Date().getTime();
        // $ 将这个agentUserId分配给当前用户
        currentAgentUserId = item.id;
        localStorage.setItem(`agentUsers`, JSON.stringify(agentUsers));
        return Promise.resolve(item);
      }
    });
    requests.push(response);
  }
  return Promise.any(requests);
}

/** 检查agentUser （用于二次确认） */
async function checkAgentUser(agentUser: IAgentUser) {
  if (!broadcaster) broadcaster = new TabsBroadcaster('AKclown', 500);
  let isAvailable = true;
  try {
    await broadcaster.send(agentUser);
    isAvailable = true;
  } catch (error) {
    // 有人在使用，触发reject逻辑
    isAvailable = false;
  }
  return isAvailable;
}

function storeAgentUserId(agentUserId: string) {
  const agentUsers =
    JSON.parse(localStorage.getItem(`agentUsers`) || '[]') || [];
  const item = agentUsers.find(
    (value: { id: string }) => value.id === agentUserId,
  );
  if (item) {
    // The agentUserID exists, update it
    item.time = new Date().getTime();
  } else {
    agentUsers.push({ id: agentUserId, time: new Date().getTime() });
  }
  localStorage.setItem(`agentUsers`, JSON.stringify(agentUsers));
  currentAgentUserId = agentUserId;
}
function verifyAgentUserId(agentUserId: string) {
  return agentUserId === currentAgentUserId;
}
export {
  findAvailableAgentUser,
  storeAgentUserId,
  verifyAgentUserId,
  checkAgentUser,
};

