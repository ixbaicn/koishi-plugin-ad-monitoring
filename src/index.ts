import { Context, Schema, h, Session } from 'koishi'
import { } from '@koishijs/plugin-http'
import { } from 'koishi-plugin-adapter-onebot'

export const name = 'ad-monitoring'

// 定义消息监测统计数据库表结构
interface MessageMonitoringStats {
  id: number
  userId: string
  guildId: string
  adCount: number      // 广告消息计次
  normalCount: number  // 正常消息计次
  lastUpdateTime: number
  createTime: number
}

// 扩展数据库表类型
declare module 'koishi' {
  interface Tables {
    message_monitoring_stats: MessageMonitoringStats
  }
}

export const usage = `📢 官方交流群：767723753\n\n欢迎加入官方QQ群交流技术、反馈问题和获取最新更新信息！\n\n🔗 快速加入：https://qm.qq.com/q/tcTUHy0bm0`;

export const inject = {
  required: ["database"],
};

export interface Config {
  /** 官方交流群信息（仅用于显示） */
  officialGroup?: string
  /** 监控的群聊 ID 列表 */
  monitoredGroups: string[]
  /** AI 模型配置 */
  aiModel: {
    /** API 端点 */
    endpoint: string
    /** API 密钥列表（支持多个密钥轮询） */
    apiKeys: string[]
    /** 模型名称 */
    modelName: string
    /** 请求超时时间（毫秒） */
    timeout: number
    /** 重试次数 */
    retryCount: number
    /** 重试间隔（毫秒） */
    retryDelay: number
    /** 用户自定义提示词（优先级高于默认提示词） */
    customPrompt: string
    /** 当前使用的API密钥索引（内部使用，用于轮询） */
    currentKeyIndex?: number
  }
  /** 广告检测规则 */
  rules: {
    /** 是否发送提醒消息 */
    sendWarning: boolean
    /** 自定义提醒消息 */
    warningMessage: string
    /** 是否撤回广告消息 */
    recallMessage: boolean
    /** 是否禁言用户 */
    muteUser: boolean
    /** 禁言时长（分钟） */
    muteDuration: number
    /** 是否踢出用户 */
    kickUser: boolean
  }
  /** 反复触发禁言规则 */
  repeatOffenseRules: {
    /** 启用反复触发禁言 */
    enabled: boolean
    /** 时间窗口（分钟）- 在此时间内的违规次数会被累计 */
    timeWindow: number
    /** 触发阈值 - 在时间窗口内触发多少次后执行禁言 */
    triggerThreshold: number
    /** 禁言时长（分钟） */
    muteDuration: number
    /** 是否踢出用户（达到阈值后） */
    kickUser: boolean
    /** 警告消息模板 */
    warningMessage: string
  }
  /** 字数排除规则 */
  lengthFilter: {
    /** 是否启用字数过滤 */
    enabled: boolean
    /** 最小字数阈值（包含此数值） */
    minLength: number
  }
  /** 关键词触发规则 */
  keywordTrigger: {
    /** 是否启用关键词触发（开启后只在监测到关键词时才会触发AI广告监测） */
    enabled: boolean
    /** 本地关键词列表（用户可修改） */
    localKeywords: string[]
    /** 云规则开关（开启后每天从远程获取最新关键词） */
    cloudRulesEnabled: boolean
    /** 云规则URL */
    cloudRulesUrl: string
    /** 云规则更新间隔（小时） */
    cloudRulesUpdateInterval: number
  }
  /** 安全名单配置 */
  safeList: {
    /** 是否启用安全名单 */
    enabled: boolean
    /** 安全名单用户ID列表（按群聊分组，只在对应群聊中生效） */
    userIds: Record<string, string[]>
    /** 自动添加到安全名单配置 */
    autoAdd: {
      /** 是否启用自动添加功能 */
      enabled: boolean
      /** 正常消息计次阈值，达到此值自动添加到安全名单 */
      normalMessageThreshold: number
      /** 广告过滤配置 */
      adFilter: {
        /** 是否启用广告过滤 */
        enabled: boolean
        /** 最大广告计次，达到或超过此值时禁止自动添加到安全名单 */
        maxAdCount: number
      }
    }
    /** 安全名单容量上限（每个群聊） */
    maxCapacity: number
  }
  /** 检测敏感度 (1-10, 数字越大越严格) */
  sensitivity: number
  /** 自动撤回通知配置 */
  autoRecallNotification: {
    /** 是否启用自动撤回通知 */
    enabled: boolean
    /** 撤回延迟时间（秒） */
    delay: number
  }
  /** 全局白名单用户 ID（在所有监控群聊中生效） */
  globalWhitelist: string[]
  /** 局部白名单（按群聊分组，只在对应群聊中生效） */
  localWhitelist: Record<string, string[]>
  /** 管理员用户 ID */
  admins: string[]
  /** 调试模式（开启后输出详细日志） */
  debugMode: boolean
  /** 性能优化配置 */
  performance: {
    /** 最大并发检测数量 */
    maxConcurrent: number
    /** 队列超时时间（毫秒） */
    queueTimeout: number
    /** 启用消息队列处理 */
    enableQueue: boolean
    /** 最大队列长度 */
    maxQueueSize: number
    /** Tokens消耗优化 */
    tokenOptimization: {
      /** 是否启用Tokens优化 */
      enabled: boolean
    }
  }
  /** 视觉模型图片识别配置 */
  visionModel: {
    /** 是否启用视觉模型图片识别 */
    enabled: boolean
    /** 视觉模型 API 端点 */
    endpoint: string
    /** 视觉模型 API 密钥列表（支持多个密钥轮询） */
    apiKeys: string[]
    /** 视觉模型名称 */
    modelName: string
    /** 视觉模型请求超时时间（毫秒） */
    timeout: number
    /** API 请求失败重试次数 */
    retryCount: number
    /** 重试间隔（毫秒） */
    retryDelay: number
    /** 当前使用的API密钥索引（内部使用，用于轮询） */
    currentKeyIndex?: number
    /** 是否跳过表情包检测 */
    skipEmoji: boolean
    /** 二维码检测配置 */
    qrCodeDetection: {
      /** 是否启用二维码检测 */
      enabled: boolean
      /** 检测到二维码时的处理策略 */
      action: {
        /** 是否直接撤回包含二维码的图片 */
        directRecall: boolean
        /** 是否发送警告消息 */
        sendWarning: boolean
        /** 警告消息内容 */
        warningMessage: string
        /** 是否禁言用户 */
        muteUser: boolean
        /** 禁言时长（分钟） */
        muteDuration: number
      }
    }
  }
  /** 嵌套转发消息检测配置 */
  nestedForwardDetection: {
    /** 是否启用嵌套转发检测 */
    enabled: boolean
    /** 检测到嵌套转发时的处理策略 */
    action: {
      /** 撤回规则类型：'global' | 'blacklist' | 'none' */
      recallType: 'global' | 'blacklist' | 'none'
      /** 黑名单用户ID列表（仅当recallType为'blacklist'时生效） */
      blacklistUsers: string[]
      /** 是否发送通知 */
      sendNotification: boolean
      /** 通知消息内容 */
      notificationMessage: string
    }
  }
  /** 链接检测配置 */
  linkDetection: {
    /** 是否启用链接检测 */
    enabled: boolean
    /** 检测到可疑链接时的处理策略 */
    action: {
      /** 是否撤回包含可疑链接的消息 */
      recallMessage: boolean
      /** 是否发送警告消息 */
      sendWarning: boolean
      /** 警告消息内容 */
      warningMessage: string
      /** 是否禁言用户 */
      muteUser: boolean
      /** 禁言时长（分钟） */
      muteDuration: number
    }
    /** 可疑链接检测规则 */
    rules: {
      /** 检测不知名域名（非常见域名的链接） */
      detectUnknownDomains: boolean
      /** 检测OSS对象存储链接 */
      detectOSSLinks: boolean
      /** 白名单域名列表（这些域名不会被检测为可疑） */
      whitelistDomains: string[]
      /** 可疑域名关键词（包含这些关键词的域名会被标记为可疑） */
      suspiciousDomainKeywords: string[]
    }
  }

}

export const Config: Schema<Config> = Schema.object({
  monitoredGroups: Schema.array(Schema.string()).description('监控的群聊 ID 列表').default([]).collapse(),
  sensitivity: Schema.number().min(1).max(10).description('检测敏感度 (1-10)').default(7),
  autoRecallNotification: Schema.object({
    enabled: Schema.boolean().description('自动撤回通知').default(false),
    delay: Schema.number().min(1).max(300).description('自动撤回延迟时间（秒）').default(30)
  }),
  globalWhitelist: Schema.array(Schema.string()).description('全局白名单用户 ID（在所有监控群聊中生效）').default(['2854196310']).collapse(),
  localWhitelist: Schema.dict(Schema.array(Schema.string())).description('局部白名单（按群聊 ID 分组，只在对应群聊中生效）').default({}).collapse(),
  admins: Schema.array(Schema.string()).description('管理员用户 ID').default([]),
  debugMode: Schema.boolean().description('调试模式（开启后输出详细日志）').default(false),
  aiModel: Schema.object({
    endpoint: Schema.string().description('AI 模型 API 端点').default('https://dashscope.aliyuncs.com/compatible-mode/v1'),
    apiKeys: Schema.array(Schema.string().role('secret')).description('API 密钥列表\n\n支持添加多个API密钥，系统将自动轮询使用以提高可用性和负载分散。\n当某个密钥请求失败时，会自动切换到下一个密钥重试。').default(['']),
    modelName: Schema.string().description('模型名称').default('qwen-plus'),
    timeout: Schema.number().description('请求超时时间（毫秒）').default(60000),
    retryCount: Schema.number().min(0).max(5).description('API 请求失败重试次数').default(2),
    retryDelay: Schema.number().min(100).max(10000).description('重试间隔（毫秒）').default(1000),
    customPrompt: Schema.string().role('textarea').description('用户自定义提示词（可选）\n\n用于追加到默认广告检测提示词中，让您可以根据特定需求补充检测逻辑。\n\n优先级规则：核心提示词 > 用户提示词 > 默认规则提示词\n\n在规则不冲突的情况下，提示词会共存；如有冲突，优先采用用户提示词。').default('')
  }).description('AI 模型配置'),
    visionModel: Schema.object({
    enabled: Schema.boolean().description('启用视觉模型图片识别\n启用后将使用大模型对图片消息进行文字识别，然后对识别出的文本进行广告检测').default(false),
    endpoint: Schema.string().description('视觉模型 API 端点').default('https://api.siliconflow.cn/v1'),
    apiKeys: Schema.array(Schema.string().role('secret')).description('视觉模型 API 密钥列表\n\n支持添加多个API密钥，系统将自动轮询使用以提高可用性和负载分散。\n当某个密钥请求失败时，会自动切换到下一个密钥重试。').default(['']),
    modelName: Schema.string().description('视觉模型名称').default('Pro/Qwen/Qwen2.5-VL-7B-Instruct'),
    timeout: Schema.number().min(5000).max(120000).description('视觉模型请求超时时间（毫秒）').default(60000),
    retryCount: Schema.number().min(0).max(5).description('API 请求失败重试次数').default(2),
    retryDelay: Schema.number().min(100).max(10000).description('重试间隔（毫秒）').default(1000),
    skipEmoji: Schema.boolean().description('跳过表情包检测\n启用后将跳过对表情包的视觉识别检测，仅检测图片').default(false),
    qrCodeDetection: Schema.object({
      enabled: Schema.boolean().description('启用二维码检测\n检测图片中是否包含二维码，如有二维码则直接执行处理流程').default(true),
      action: Schema.object({
        directRecall: Schema.boolean().description('直接撤回\n检测到二维码时直接撤回消息，不进行AI文字检测').default(true),
        sendWarning: Schema.boolean().description('发送警告消息').default(true),
        warningMessage: Schema.string().description('警告消息内容').default('⚠️ 检测到图片包含二维码，请注意识别'),
        muteUser: Schema.boolean().description('禁言用户').default(false),
        muteDuration: Schema.number().min(1).max(1440).description('禁言时长（分钟）').default(10)
      })
    })
  }).description('视觉模型配置'),
  rules: Schema.object({
    sendWarning: Schema.boolean().description('发送提醒消息').default(true),
    warningMessage: Schema.string().description('自定义提醒消息').default('⚠️ 检测到疑似广告内容，请注意识别！'),
    recallMessage: Schema.boolean().description('撤回广告消息').default(false),
    muteUser: Schema.boolean().description('禁言用户').default(false),
    muteDuration: Schema.number().description('禁言时长（分钟）').default(10),
    kickUser: Schema.boolean().description('踢出用户').default(false)
  }).description('处理规则'),
  repeatOffenseRules: Schema.object({
    enabled: Schema.boolean().description('反复触发禁言处理').default(false),
    timeWindow: Schema.number().min(5).max(1440).description('时间窗口（分钟）\n在此时间内的违规次数会被累计计算').default(60),
    triggerThreshold: Schema.number().min(2).max(10).description('触发阈值\n在时间窗口内触发多少次广告检测后执行禁言').default(3),
    muteDuration: Schema.number().min(1).max(10080).description('禁言时长（分钟）\n达到触发阈值后的禁言时间').default(60),
    kickUser: Schema.boolean().description('踢出用户\n达到触发阈值后是否踢出用户').default(false),
    warningMessage: Schema.string().description('警告消息模板\n{count} = 当前违规次数，{threshold} = 触发阈值，{timeWindow} = 时间窗口').default('⚠️ 用户 {userId} 在 {timeWindow} 分钟内第 {count} 次触发广告检测，已达到阈值 {threshold}，执行禁言处理！')
  }).description('反复触发规则'),
  keywordTrigger: Schema.object({
    enabled: Schema.boolean().description('关键词触发\n\n开启后只在监测到关键词时才会触发AI广告监测，否则不监测。视觉识别和其他转换正常执行，但执行后也要看这个规则来判断是否需要让AI检测').default(false),
    localKeywords: Schema.array(Schema.string()).description('本地关键词列表\n用户可以自定义修改的关键词，检测到这些关键词时会触发AI广告监测').default(['加', '伽', '免费', '赚', '群', '裙']).collapse(),
    cloudRulesEnabled: Schema.boolean().description('启用云规则\n开启后每天从远程获取最新的关键词规则，云规则可与本地规则共同生效').default(false),
    cloudRulesUrl: Schema.string().description('云规则url地址').default('https://gitee.com/ibaizhan/ziyuankuXbai/raw/master/Advertising_keywords.json'),
    cloudRulesUpdateInterval: Schema.number().min(1).max(168).description('云规则更新间隔（小时）\n多久更新一次云规则').default(24)
  }).description('检测触发规则'),
  lengthFilter: Schema.object({
    enabled: Schema.boolean().description('字数过滤\n\n启用后将跳过过短的消息，不进行AI检测').default(true),
    minLength: Schema.number().min(1).max(100).description('最小字数阈值\n低于此字数的消息将被跳过').default(3)
  }),
  safeList: Schema.object({
    enabled: Schema.boolean().description('开启后安全名单中的用户将跳过广告监测，类似于局部白名单功能。关闭后安全名单失效').default(false),
    userIds: Schema.dict(Schema.array(Schema.string())).description('安全名单用户ID列表（按群聊分组，只在对应群聊中生效）').default({}).collapse(),
    autoAdd: Schema.object({
      enabled: Schema.boolean().description('开启后当用户的正常消息计次达到阈值时，自动将该用户添加到对应群的安全名单中').default(false),
      normalMessageThreshold: Schema.number().min(1).max(1000).description('正常消息计次阈值\n用户在群内发送的正常消息数量达到此值时，自动添加到安全名单').default(50),
      adFilter: Schema.object({
        enabled: Schema.boolean().description('开启后，被触发过指定数量或以上广告检测的用户，即使达到正常消息阈值也不能进入安全名单').default(false),
        maxAdCount: Schema.number().min(1).max(100).description('最大广告计次\n用户的广告消息计次达到或超过此值时，将被禁止自动添加到安全名单').default(3)
      })
    }),
    maxCapacity: Schema.number().min(1).max(1000).description('安全名单容量上限\n\n每个群聊的安全名单最大用户数量，达到上限后会自动清理最不活跃的用户').default(100)
  }).description('安全名单规则'),
  performance: Schema.object({
    maxConcurrent: Schema.number().min(1).max(20).description('最大并发检测数量').default(5),
    queueTimeout: Schema.number().min(1000).max(60000).description('队列超时时间（毫秒）').default(30000),
    enableQueue: Schema.boolean().description('启用消息队列处理').default(true),
    maxQueueSize: Schema.number().min(10).max(1000).description('最大队列长度，超出部分将被丢弃').default(100),
    tokenOptimization: Schema.object({
      enabled: Schema.boolean().description('启用Tokens消耗优化\n启用后将优化AI模型的输出，减少不必要的思考过程，仅返回检测结果（部分模型可能无效）').default(false)
    })
  }).description('性能优化配置'),
  nestedForwardDetection: Schema.object({
    enabled: Schema.boolean().description('启用后将检测合并转发消息中是否包含嵌套的转发消息').default(true),
    action: Schema.object({
      recallType: Schema.union([
        Schema.const('global').description('全局撤回 - 对所有用户生效'),
        Schema.const('blacklist').description('黑名单撤回 - 仅对黑名单用户生效'),
        Schema.const('none').description('不撤回 - 仅发送通知')
      ]).description('处理策略规则类型').default('none'),
      blacklistUsers: Schema.array(Schema.string()).description('黑名单用户ID列表\n仅当撤回类型为"黑名单撤回"时生效').default([]).collapse(),
      sendNotification: Schema.boolean().description('发送通知\n检测到嵌套转发时是否发送通知消息').default(true),
      notificationMessage: Schema.string().description('通知消息内容\n检测到嵌套转发时发送的通知消息').default('⚠️ 检测到嵌套的合并转发消息，请注意内容安全')
    })
  }).description('嵌套转发消息检测配置'),
  linkDetection: Schema.object({
    enabled: Schema.boolean().description('启用链接检测\n检测消息中的可疑链接，包括不知名域名和OSS对象存储链接').default(true),
    action: Schema.object({
      recallMessage: Schema.boolean().description('撤回包含可疑链接的消息').default(true),
      sendWarning: Schema.boolean().description('发送警告消息').default(true),
      warningMessage: Schema.string().description('警告消息内容').default('⚠️ 检测到可疑链接，请注意识别'),
      muteUser: Schema.boolean().description('禁言用户').default(false),
      muteDuration: Schema.number().min(1).max(1440).description('禁言时长（分钟）').default(10)
    }),
    rules: Schema.object({
      detectUnknownDomains: Schema.boolean().description('检测不知名域名\n对非常见域名的链接进行检测').default(true),
      detectOSSLinks: Schema.boolean().description('检测OSS对象存储链接\n检测阿里云OSS、腾讯云COS、七牛云等对象存储链接').default(true),
      whitelistDomains: Schema.array(Schema.string()).description('白名单域名列表\n这些域名不会被检测为可疑链接').default([
        'qq.com', 'qzone.qq.com', 'weixin.qq.com', 'tencent.com',
        'baidu.com', 'taobao.com', 'tmall.com', 'jd.com', 'alibaba.com',
        'github.com', 'gitee.com', 'bilibili.com', 'b23.tv', 'zhihu.com',
        'weibo.com', 'github.com', 'gitee.com', 'gitlab.com', 'microsoft.com',
        'yuanshen.com', 'volcengine.com', 'douyin.com', 'xiaohongshu.com', 'kuaishou.com',
        'bing.com', 'google.com', 'npmjs.com', 'js.org', 'ts.isc.org.cn',
        'gov.cn', '163.com', 'rainyun.com', 'aliyun.com', 'mi.com',
        'mi.cn', 'xiaomi.cn', 'xiaomi.com', 'huawei.com', 'huaweicloud.com',
        'oppo.com', 'iqoo.com', 'vivo.com.cn', 'vivo.com', 'meizu.com',
        'meituan.com', '52pojie.cn', 'fit2cloud.com', 'huorong.cn', '360.cn',
        '360.com', 'so.com', 'deepseek.com', 'csdn.com', 'csdn.net',
        'cnblogs.com', 'ele.me', 'sina.com.cn', 'thepaper.cn', 'smzdm.com',
        'sohu.com', 'cctv.com', 'cctv.cn', 'msn.cn', '12315.cn',
        '12306.cn', 'coolapk.com', 'xiaoheihe.cn', 'sogou.com', 'live.com',
        'steampowered.com', 's.team', 's.team', 'wegame.com.cn', 'epicgames.com',
        '1panel.cn', 'bt.cn'
      ]).collapse(),
      suspiciousDomainKeywords: Schema.array(Schema.string()).description('可疑域名关键词\n包含这些关键词的域名会被标记为可疑').default([
        'oss', 'cos', 'qiniu', 'upyun', 'ucloud', 'baidubce',
        'download', 'file', 'cdn', 'static', 'assets'
      ]).collapse()
    })
  }).description('链接检测配置'),

})



// 消息队列和并发控制
interface QueueItem {
  session: any
  messageContent: string
  timestamp: number
  resolve: (value: boolean) => void
  reject: (error: any) => void
}

// 用户违规记录
interface OffenseRecord {
  userId: string
  guildId: string
  timestamp: number
  messageContent: string
}

// 云规则管理器
class CloudRulesManager {
  private cloudKeywords: string[] = []
  private lastUpdateTime: number = 0
  private config: Config
  private ctx: Context
  private updateTimer: NodeJS.Timeout | null = null

  constructor(ctx: Context, config: Config) {
    this.ctx = ctx
    this.config = config
    
    // 如果启用了云规则，立即开始更新
    if (config.keywordTrigger.cloudRulesEnabled) {
      this.startAutoUpdate()
    }
  }

  // 开始自动更新
  startAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
    }
    
    // 立即执行一次更新
    this.updateCloudRules()
    
    // 设置定时更新
    const intervalMs = this.config.keywordTrigger.cloudRulesUpdateInterval * 60 * 60 * 1000
    this.updateTimer = setInterval(() => {
      this.updateCloudRules()
    }, intervalMs)
    
    if (this.config.debugMode) {
      this.ctx.logger.info(`[DEBUG] 云规则自动更新已启动，更新间隔: ${this.config.keywordTrigger.cloudRulesUpdateInterval} 小时`)
    }
  }

  // 停止自动更新
  stopAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = null
      if (this.config.debugMode) {
        this.ctx.logger.info('[DEBUG] 云规则自动更新已停止')
      }
    }
  }

  // 解析Git平台URL为原始文件URL
  private parseGitUrl(url: string): string {
    // 检查是否为Gitee URL
    if (url.includes('gitee.com') && url.includes('/blob/')) {
      // 将 /blob/ 替换为 /raw/ 以获取原始文件内容
      return url.replace('/blob/', '/raw/')
    }
    
    // 检查是否为GitHub URL
    if (url.includes('github.com') && url.includes('/blob/')) {
      // GitHub: 将 github.com 替换为 raw.githubusercontent.com，移除 /blob/
      return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
    }
    
    // 检查是否为GitLab URL
    if (url.includes('gitlab.com') && url.includes('/blob/')) {
      // GitLab: 将 /blob/ 替换为 /raw/
      return url.replace('/blob/', '/raw/')
    }
    
    return url
  }

  // 更新云规则
  async updateCloudRules(): Promise<void> {
    if (!this.config.keywordTrigger.cloudRulesEnabled) {
      return
    }

    try {
      if (this.config.debugMode) {
        this.ctx.logger.info(`[DEBUG] 开始更新云规则: ${this.config.keywordTrigger.cloudRulesUrl}`)
      }

      // 解析URL（处理Git平台的链接）
      const actualUrl = this.parseGitUrl(this.config.keywordTrigger.cloudRulesUrl)
      
      if (this.config.debugMode && actualUrl !== this.config.keywordTrigger.cloudRulesUrl) {
        this.ctx.logger.info(`[DEBUG] URL已解析: ${actualUrl}`)
      }

      // 获取云规则数据
      const response = await this.ctx.http.get(actualUrl, {
        timeout: 30000
      })

      let keywords: string[] = []
      
      // 尝试解析JSON格式
      if (typeof response === 'object' && response !== null) {
        if (Array.isArray(response)) {
          // 直接是字符串数组格式（如cloud-rules-simple.json）
          keywords = response.filter(item => typeof item === 'string')
        } else if (response.keywords && Array.isArray(response.keywords)) {
          // 包含keywords字段的对象格式
          keywords = response.keywords.filter(item => typeof item === 'string')
        } else if (response.data && Array.isArray(response.data)) {
          // 包含data字段的对象格式
          keywords = response.data.filter(item => typeof item === 'string')
        }
      } else if (typeof response === 'string') {
        try {
          const parsed = JSON.parse(response)
          if (Array.isArray(parsed)) {
            // 解析后是字符串数组格式（推荐格式）
            keywords = parsed.filter(item => typeof item === 'string')
          } else if (parsed.keywords && Array.isArray(parsed.keywords)) {
            // 解析后包含keywords字段
            keywords = parsed.keywords.filter(item => typeof item === 'string')
          } else if (parsed.data && Array.isArray(parsed.data)) {
            // 解析后包含data字段
            keywords = parsed.data.filter(item => typeof item === 'string')
          }
        } catch (parseError) {
          // 如果不是JSON，尝试按行分割（兼容纯文本格式）
          keywords = response.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
          
          if (this.config.debugMode) {
            this.ctx.logger.info('[DEBUG] 云规则解析为纯文本格式')
          }
        }
      }

      if (keywords.length > 0) {
        this.cloudKeywords = keywords
        this.lastUpdateTime = Date.now()
        
        if (this.config.debugMode) {
          this.ctx.logger.info(`[DEBUG] 云规则更新成功: 获取到 ${keywords.length} 个关键词`)
          this.ctx.logger.info(`[DEBUG] 云规则关键词预览: ${keywords.slice(0, 10).join(', ')}${keywords.length > 10 ? '...' : ''}`)
        } else {
          this.ctx.logger.info(`✅ 云规则更新成功: 获取到 ${keywords.length} 个关键词`)
        }
      } else {
        this.ctx.logger.warn('⚠️ 云规则更新失败: 未获取到有效的关键词数据')
        if (this.config.debugMode) {
          this.ctx.logger.warn('[DEBUG] 响应数据:', JSON.stringify(response, null, 2))
        }
      }
    } catch (error) {
      this.ctx.logger.error(`❌ 云规则更新失败: ${error.message}`)
      if (this.config.debugMode) {
        this.ctx.logger.error('[DEBUG] 云规则更新错误详情:', error)
      }
    }
  }

  // 获取所有关键词（本地 + 云规则）
  getAllKeywords(): string[] {
    const localKeywords = this.config.keywordTrigger.localKeywords || []
    const allKeywords = [...localKeywords]
    
    if (this.config.keywordTrigger.cloudRulesEnabled) {
      allKeywords.push(...this.cloudKeywords)
    }
    
    // 去重
    return [...new Set(allKeywords)]
  }

  // 获取云规则关键词
  getCloudKeywords(): string[] {
    return [...this.cloudKeywords]
  }

  // 获取统计信息
  getStats(): { localCount: number, cloudCount: number, totalCount: number, lastUpdateTime: number } {
    const localCount = this.config.keywordTrigger.localKeywords?.length || 0
    const cloudCount = this.cloudKeywords.length
    const allKeywords = this.getAllKeywords()
    
    return {
      localCount,
      cloudCount,
      totalCount: allKeywords.length,
      lastUpdateTime: this.lastUpdateTime
    }
  }

  // 手动触发更新
  async manualUpdate(): Promise<{ success: boolean, message: string }> {
    try {
      await this.updateCloudRules()
      const stats = this.getStats()
      return {
        success: true,
        message: `云规则更新成功: 本地关键词 ${stats.localCount} 个，云规则关键词 ${stats.cloudCount} 个，总计 ${stats.totalCount} 个`
      }
    } catch (error) {
      return {
        success: false,
        message: `云规则更新失败: ${error.message}`
      }
    }
  }

  // 重新配置（当配置更改时调用）
  reconfigure(newConfig: Config): void {
    this.config = newConfig
    
    if (newConfig.keywordTrigger.cloudRulesEnabled) {
      this.startAutoUpdate()
    } else {
      this.stopAutoUpdate()
    }
  }

  // 销毁
  destroy(): void {
    this.stopAutoUpdate()
  }
}

// 自动撤回通知辅助函数
async function sendNotificationWithAutoRecall(
  session: any,
  message: string,
  config: Config
): Promise<void> {
  try {
    const sentMessage = await session.send(message)
    
    // 如果启用了自动撤回功能
    if (config.autoRecallNotification.enabled && config.autoRecallNotification.delay > 0) {
      setTimeout(async () => {
        try {
          if (sentMessage && sentMessage.length > 0) {
            // 撤回消息
            await session.bot.deleteMessage(session.channelId, sentMessage[0])
            if (config.debugMode) {
              session.app.logger.info(`[DEBUG] ✅ 已自动撤回通知消息，延迟: ${config.autoRecallNotification.delay}秒`)
            }
          }
        } catch (error) {
          if (config.debugMode) {
            session.app.logger.error('[DEBUG] ❌ 自动撤回通知消息失败:', error)
          }
        }
      }, config.autoRecallNotification.delay * 1000)
    }
  } catch (error) {
    if (config.debugMode) {
      session.app.logger.error('[DEBUG] ❌ 发送通知消息失败:', error)
    }
  }
}

// 违规记录管理器
class OffenseTracker {
  private records: OffenseRecord[] = []
  private config: Config
  private ctx: Context

  constructor(ctx: Context, config: Config) {
    this.ctx = ctx
    this.config = config
    
    // 定期清理过期记录（每10分钟清理一次）
    setInterval(() => {
      this.cleanExpiredRecords()
    }, 10 * 60 * 1000)
  }

  // 添加违规记录
  addOffense(userId: string, guildId: string, messageContent: string): number {
    const now = Date.now()
    const record: OffenseRecord = {
      userId,
      guildId,
      timestamp: now,
      messageContent
    }
    
    this.records.push(record)
    
    if (this.config.debugMode) {
      this.ctx.logger.info(`[DEBUG] 添加违规记录: 用户=${userId}, 群=${guildId}, 时间=${new Date(now).toLocaleString()}`)
    }
    
    // 返回该用户在时间窗口内的违规次数
    return this.getOffenseCount(userId, guildId)
  }

  // 获取用户在时间窗口内的违规次数
  getOffenseCount(userId: string, guildId: string): number {
    if (!this.config.repeatOffenseRules.enabled) {
      return 0
    }
    
    const now = Date.now()
    const timeWindowMs = this.config.repeatOffenseRules.timeWindow * 60 * 1000
    const cutoffTime = now - timeWindowMs
    
    const count = this.records.filter(record => 
      record.userId === userId &&
      record.guildId === guildId &&
      record.timestamp >= cutoffTime
    ).length
    
    if (this.config.debugMode) {
      this.ctx.logger.info(`[DEBUG] 用户 ${userId} 在群 ${guildId} 的 ${this.config.repeatOffenseRules.timeWindow} 分钟内违规次数: ${count}`)
    }
    
    return count
  }

  // 清理过期记录
  private cleanExpiredRecords(): void {
    if (!this.config.repeatOffenseRules.enabled) {
      return
    }
    
    const now = Date.now()
    const timeWindowMs = this.config.repeatOffenseRules.timeWindow * 60 * 1000
    const cutoffTime = now - timeWindowMs
    
    const beforeCount = this.records.length
    this.records = this.records.filter(record => record.timestamp >= cutoffTime)
    const afterCount = this.records.length
    
    if (this.config.debugMode && beforeCount !== afterCount) {
      this.ctx.logger.info(`[DEBUG] 清理过期违规记录: ${beforeCount} -> ${afterCount} (清理了 ${beforeCount - afterCount} 条)`)
    }
  }

  // 获取统计信息
  getStats(): { totalRecords: number, activeRecords: number } {
    const now = Date.now()
    const timeWindowMs = this.config.repeatOffenseRules.timeWindow * 60 * 1000
    const cutoffTime = now - timeWindowMs
    
    const activeRecords = this.records.filter(record => record.timestamp >= cutoffTime).length
    
    return {
      totalRecords: this.records.length,
      activeRecords
    }
  }

  // 判断是否为反复违规
  isRepeatOffense(userId: string, guildId: string): boolean {
    if (!this.config.repeatOffenseRules.enabled) {
      return false
    }
    
    const count = this.getOffenseCount(userId, guildId)
    const isRepeat = count >= this.config.repeatOffenseRules.triggerThreshold
    
    if (this.config.debugMode) {
      this.ctx.logger.info(`[DEBUG] 反复违规判断: 用户=${userId}, 群=${guildId}, 次数=${count}, 阈值=${this.config.repeatOffenseRules.triggerThreshold}, 结果=${isRepeat}`)
    }
    
    return isRepeat
  }

  // 重置所有记录
  reset(): void {
    this.records = []
    if (this.config.debugMode) {
      this.ctx.logger.info('[DEBUG] 已重置所有违规记录')
    }
  }
}

// 消息监测统计管理类
class MessageMonitoringStatsManager {
  private ctx: Context
  private config: Config

  constructor(ctx: Context, config: Config) {
    this.ctx = ctx
    this.config = config
  }

  // 初始化数据库表
  async initializeDatabase(): Promise<void> {
    try {
      this.ctx.model.extend('message_monitoring_stats', {
        id: 'unsigned',
        userId: 'string',
        guildId: 'string',
        adCount: 'unsigned',
        normalCount: 'unsigned',
        lastUpdateTime: 'unsigned',
        createTime: 'unsigned'
      }, {
        primary: 'id',
        autoInc: true
      })
      
      if (this.config.debugMode) {
        this.ctx.logger.info('[DEBUG] 消息监测统计数据库表初始化完成')
      }
    } catch (error) {
      this.ctx.logger.error('消息监测统计数据库表初始化失败:', error)
    }
  }

  // 记录消息统计
  async recordMessage(userId: string, guildId: string, isAd: boolean): Promise<void> {
    try {
      const now = Date.now()
      
      // 查找现有记录
      const existingRecord = await this.ctx.database.get('message_monitoring_stats', {
        userId,
        guildId
      })

      let newNormalCount = 0
      if (existingRecord.length > 0) {
        // 更新现有记录
        const record = existingRecord[0]
        const updateData: Partial<MessageMonitoringStats> = {
          lastUpdateTime: now
        }

        if (isAd) {
          updateData.adCount = record.adCount + 1
        } else {
          updateData.normalCount = record.normalCount + 1
          newNormalCount = record.normalCount + 1
        }

        await this.ctx.database.set('message_monitoring_stats', { id: record.id }, updateData)
      } else {
        // 创建新记录
        const newRecord: Omit<MessageMonitoringStats, 'id'> = {
          userId,
          guildId,
          adCount: isAd ? 1 : 0,
          normalCount: isAd ? 0 : 1,
          lastUpdateTime: now,
          createTime: now
        }

        newNormalCount = isAd ? 0 : 1
        await this.ctx.database.create('message_monitoring_stats', newRecord)
      }

      // 检查是否需要自动添加到安全名单
      if (!isAd && this.config.safeList.autoAdd.enabled && newNormalCount >= this.config.safeList.autoAdd.normalMessageThreshold) {
        // 检查广告过滤条件
        let canAddToSafeList = true
        if (this.config.safeList.autoAdd.adFilter.enabled) {
          const userStats = await this.getUserStats(userId, guildId)
          const adCount = userStats?.adCount || 0
          if (adCount >= this.config.safeList.autoAdd.adFilter.maxAdCount) {
            canAddToSafeList = false
            if (this.config.debugMode) {
              this.ctx.logger.info(`[DEBUG] 用户 ${userId} 在群 ${guildId} 因广告数量 ${adCount} 超过限制 ${this.config.safeList.autoAdd.adFilter.maxAdCount}，不能自动添加到安全名单`)
            }
          }
        }
        
        if (canAddToSafeList) {
          await this.autoAddToSafeList(userId, guildId, newNormalCount)
        }
      }

      if (this.config.debugMode) {
        this.ctx.logger.info(`[DEBUG] 记录消息统计: 用户 ${userId} 在群 ${guildId} 的${isAd ? '广告' : '正常'}消息计次已更新`)
      }
    } catch (error) {
      this.ctx.logger.error('记录消息统计失败:', error)
    }
  }

  // 仅更新用户活跃时间，不增加任何计数（用于安全名单用户）
  async updateLastActiveTime(userId: string, guildId: string): Promise<void> {
    try {
      const now = Date.now()
      
      // 查找现有记录
      const existingRecord = await this.ctx.database.get('message_monitoring_stats', {
        userId,
        guildId
      })

      if (existingRecord.length > 0) {
        // 更新现有记录的lastUpdateTime
        const record = existingRecord[0]
        await this.ctx.database.set('message_monitoring_stats', { id: record.id }, {
          lastUpdateTime: now
        })
      } else {
        // 创建新记录，但不增加任何计数
        const newRecord: Omit<MessageMonitoringStats, 'id'> = {
          userId,
          guildId,
          adCount: 0,
          normalCount: 0,
          lastUpdateTime: now,
          createTime: now
        }
        await this.ctx.database.create('message_monitoring_stats', newRecord)
      }

      if (this.config.debugMode) {
        this.ctx.logger.info(`[DEBUG] 更新安全名单用户活跃时间: 用户 ${userId} 在群 ${guildId}`)
      }
    } catch (error) {
      this.ctx.logger.error('更新用户活跃时间失败:', error)
    }
  }

  // 自动添加用户到安全名单
  private async autoAddToSafeList(userId: string, guildId: string, normalCount: number): Promise<void> {
    try {
      // 确保当前群组的安全名单数组存在
      if (!this.config.safeList.userIds[guildId]) {
        this.config.safeList.userIds[guildId] = []
      }

      const currentGuildUsers = this.config.safeList.userIds[guildId]
      
      // 检查用户是否已在安全名单中
      if (!currentGuildUsers.includes(userId)) {
        // 检查是否达到容量上限
        if (currentGuildUsers.length >= this.config.safeList.maxCapacity) {
          await this.pruneLeastActiveUsers(guildId)
        }
        
        currentGuildUsers.push(userId)
        
        // 将用户的统计数据设为null（表示已在安全名单中）
        await this.resetUserStats(userId, guildId, true)
        
        // 更新配置并重载插件
        this.ctx.scope.update(this.config, true)
        
        if (this.config.debugMode) {
          this.ctx.logger.info(`[DEBUG] 自动添加到安全名单: 用户 ${userId} 在群 ${guildId} 的正常消息达到 ${normalCount} 条，已自动添加到安全名单`)
        }
      }
    } catch (error) {
      this.ctx.logger.error('自动添加到安全名单失败:', error)
    }
  }

  // 清理最不活跃的用户
  private async pruneLeastActiveUsers(guildId: string): Promise<void> {
    try {
      const currentGuildUsers = this.config.safeList.userIds[guildId]
      if (!currentGuildUsers || currentGuildUsers.length === 0) {
        return
      }

      // 获取所有用户的统计数据
      const userStats: Array<{ userId: string; lastUpdateTime: number; normalCount: number }> = []
      
      for (const userId of currentGuildUsers) {
        const stats = await this.getUserStats(userId, guildId)
        userStats.push({
          userId,
          lastUpdateTime: stats?.lastUpdateTime || 0,
          normalCount: stats?.normalCount || 0
        })
      }

      // 按活跃度排序（最后更新时间越早，正常消息数越少的用户越不活跃）
      userStats.sort((a, b) => {
        if (a.lastUpdateTime !== b.lastUpdateTime) {
          return a.lastUpdateTime - b.lastUpdateTime // 最后更新时间越早越不活跃
        }
        return a.normalCount - b.normalCount // 正常消息数越少越不活跃
      })

      // 移除最不活跃的用户（保留容量-1个位置给新用户）
      const usersToRemove = userStats.slice(0, userStats.length - this.config.safeList.maxCapacity + 1)
      
      for (const userToRemove of usersToRemove) {
        const index = currentGuildUsers.indexOf(userToRemove.userId)
        if (index > -1) {
          currentGuildUsers.splice(index, 1)
          // 重置被移除用户的统计数据为0
          await this.resetUserStats(userToRemove.userId, guildId, false)
          
          if (this.config.debugMode) {
            this.ctx.logger.info(`[DEBUG] 安全名单容量管理: 移除最不活跃用户 ${userToRemove.userId} 从群 ${guildId} 的安全名单`)
          }
        }
      }
    } catch (error) {
      this.ctx.logger.error('清理最不活跃用户失败:', error)
    }
  }

  // 重置用户统计数据
  async resetUserStats(userId: string, guildId: string, setToNull: boolean): Promise<void> {
    try {
      const existingRecord = await this.ctx.database.get('message_monitoring_stats', {
        userId,
        guildId
      })

      if (existingRecord.length > 0) {
        const record = existingRecord[0]
        const updateData: Partial<MessageMonitoringStats> = {
          adCount: setToNull ? null : 0,
          normalCount: setToNull ? null : 0,
          lastUpdateTime: Date.now()
        }

        await this.ctx.database.set('message_monitoring_stats', { id: record.id }, updateData)
        
        if (this.config.debugMode) {
          this.ctx.logger.info(`[DEBUG] 重置用户统计: 用户 ${userId} 在群 ${guildId} 的统计数据已${setToNull ? '设为null' : '重置为0'}`)
        }
      }
    } catch (error) {
      this.ctx.logger.error('重置用户统计数据失败:', error)
    }
  }

  // 获取用户在特定群的统计信息
  async getUserStats(userId: string, guildId: string): Promise<MessageMonitoringStats | null> {
    try {
      const records = await this.ctx.database.get('message_monitoring_stats', {
        userId,
        guildId
      })
      
      return records.length > 0 ? records[0] : null
    } catch (error) {
      this.ctx.logger.error('获取用户统计信息失败:', error)
      return null
    }
  }

  // 获取群内所有用户的统计信息
  async getGuildStats(guildId: string): Promise<MessageMonitoringStats[]> {
    try {
      return await this.ctx.database.get('message_monitoring_stats', {
        guildId
      })
    } catch (error) {
      this.ctx.logger.error('获取群统计信息失败:', error)
      return []
    }
  }

  // 获取用户在所有群的统计信息
  async getUserAllStats(userId: string): Promise<MessageMonitoringStats[]> {
    try {
      return await this.ctx.database.get('message_monitoring_stats', {
        userId
      })
    } catch (error) {
      this.ctx.logger.error('获取用户全部统计信息失败:', error)
      return []
    }
  }

  // 清理过期数据（可选功能）
  async cleanupOldData(daysToKeep: number = 90): Promise<void> {
    try {
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000)
      
      await this.ctx.database.remove('message_monitoring_stats', {
        lastUpdateTime: { $lt: cutoffTime }
      })
      
      if (this.config.debugMode) {
        this.ctx.logger.info(`[DEBUG] 已清理 ${daysToKeep} 天前的消息统计数据`)
      }
    } catch (error) {
      this.ctx.logger.error('清理过期数据失败:', error)
    }
  }

  // 获取统计概览
  async getStatsOverview(): Promise<{
    totalUsers: number
    totalGuilds: number
    totalAdMessages: number
    totalNormalMessages: number
  }> {
    try {
      const allStats = await this.ctx.database.get('message_monitoring_stats', {})
      
      const uniqueUsers = new Set(allStats.map(stat => stat.userId)).size
      const uniqueGuilds = new Set(allStats.map(stat => stat.guildId)).size
      const totalAdMessages = allStats.reduce((sum, stat) => sum + stat.adCount, 0)
      const totalNormalMessages = allStats.reduce((sum, stat) => sum + stat.normalCount, 0)
      
      return {
        totalUsers: uniqueUsers,
        totalGuilds: uniqueGuilds,
        totalAdMessages,
        totalNormalMessages
      }
    } catch (error) {
      this.ctx.logger.error('获取统计概览失败:', error)
      return {
        totalUsers: 0,
        totalGuilds: 0,
        totalAdMessages: 0,
        totalNormalMessages: 0
      }
    }
  }
}

class MessageQueue {
  private queue: QueueItem[] = []
  private processing = 0
  private maxConcurrent: number
  private queueTimeout: number
  private maxQueueSize: number
  private ctx: Context
  private config: Config
  
  // 性能统计
  private stats = {
    totalProcessed: 0,
    totalErrors: 0,
    totalTimeouts: 0,
    totalQueueFull: 0,
    averageProcessingTime: 0,
    lastResetTime: Date.now()
  }

  constructor(ctx: Context, config: Config) {
    this.ctx = ctx
    this.config = config
    this.maxConcurrent = config.performance.maxConcurrent
    this.queueTimeout = config.performance.queueTimeout
    this.maxQueueSize = config.performance.maxQueueSize
  }

  async addToQueue(session: any, messageContent: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // 检查队列长度
      if (this.queue.length >= this.maxQueueSize) {
        this.stats.totalQueueFull++
        if (this.config.debugMode) {
          this.ctx.logger.warn(`[DEBUG] 队列已满，丢弃消息: 用户=${session.userId}, 队列长度=${this.queue.length}`)
        }
        reject(new Error('队列已满'))
        return
      }

      const item: QueueItem = {
        session,
        messageContent,
        timestamp: Date.now(),
        resolve,
        reject
      }

      this.queue.push(item)
      
      if (this.config.debugMode) {
        this.ctx.logger.info(`[DEBUG] 消息加入队列: 用户=${session.userId}, 队列长度=${this.queue.length}, 处理中=${this.processing}`)
      }

      // 设置超时
      setTimeout(() => {
        const index = this.queue.indexOf(item)
        if (index !== -1) {
          this.queue.splice(index, 1)
          this.stats.totalTimeouts++
          reject(new Error('队列超时'))
          if (this.config.debugMode) {
            this.ctx.logger.warn(`[DEBUG] 队列超时，移除消息: 用户=${session.userId}`)
          }
        }
      }, this.queueTimeout)

      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    const item = this.queue.shift()
    if (!item) return

    this.processing++
    const startTime = Date.now()
    
    if (this.config.debugMode) {
      this.ctx.logger.info(`[DEBUG] 开始处理队列消息: 用户=${item.session.userId}, 处理中=${this.processing}/${this.maxConcurrent}`)
    }

    try {
      const isAd = await detectAdvertisement(this.ctx, this.config, item.messageContent)
      item.resolve(isAd)
      
      // 更新统计信息
      const processingTime = Date.now() - startTime
      this.stats.totalProcessed++
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * (this.stats.totalProcessed - 1) + processingTime) / this.stats.totalProcessed
      
      if (this.config.debugMode) {
        this.ctx.logger.info(`[DEBUG] 队列消息处理完成: ${isAd ? '是广告' : '非广告'} | 用户=${item.session.userId} | 耗时=${processingTime}ms`)
      }
    } catch (error) {
      this.stats.totalErrors++
      item.reject(error)
      if (this.config.debugMode) {
        this.ctx.logger.error(`[DEBUG] 队列消息处理失败: 用户=${item.session.userId}, 错误=${error.message}`)
      }
    } finally {
      this.processing--
      // 继续处理队列中的下一个消息
      setImmediate(() => this.processQueue())
    }
  }

  getStatus() {
    const uptime = Date.now() - this.stats.lastResetTime
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      maxConcurrent: this.maxConcurrent,
      stats: {
        ...this.stats,
        uptime: uptime,
        uptimeFormatted: this.formatUptime(uptime),
        successRate: this.stats.totalProcessed > 0 ? 
          ((this.stats.totalProcessed - this.stats.totalErrors) / this.stats.totalProcessed * 100).toFixed(2) + '%' : '0%'
      }
    }
  }
  
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }
  
  resetStats() {
    this.stats = {
      totalProcessed: 0,
      totalErrors: 0,
      totalTimeouts: 0,
      totalQueueFull: 0,
      averageProcessingTime: 0,
      lastResetTime: Date.now()
    }
  }
}

// 关键词检测函数
function containsKeywords(text: string, keywords: string[]): boolean {
  if (!text || keywords.length === 0) {
    return false
  }
  
  const normalizedText = text.toLowerCase()
  return keywords.some(keyword => {
    const normalizedKeyword = keyword.toLowerCase()
    return normalizedText.includes(normalizedKeyword)
  })
}

// 检查是否应该触发AI检测
function shouldTriggerAIDetection(config: Config, text: string, cloudRulesManager: CloudRulesManager | null): boolean {
  // 如果关键词触发功能未启用，直接返回true（保持原有行为）
  if (!config.keywordTrigger.enabled) {
    return true
  }
  
  // 获取所有关键词
  const allKeywords = cloudRulesManager ? cloudRulesManager.getAllKeywords() : (config.keywordTrigger.localKeywords || [])
  
  // 检查是否包含关键词
  const hasKeywords = containsKeywords(text, allKeywords)
  
  if (config.debugMode) {
    // 注意：这里不能使用ctx.logger，因为函数没有ctx参数，调试信息会在消息处理中输出
  }
  
  return hasKeywords
}

export function apply(ctx: Context, config: Config) {


  // 验证配置
  if (!config.aiModel.endpoint || !config.aiModel.apiKeys || config.aiModel.apiKeys.length === 0 || !config.aiModel.apiKeys.some(key => key && key.trim() !== '')) {
    ctx.logger.warn('AI 模型配置不完整，插件将无法正常工作')
    return
  }
  
  // 初始化API密钥索引
  ApiKeyManager.initializeKeyIndexes(config)

  if (config.monitoredGroups.length === 0) {
    ctx.logger.warn('未配置监控群聊，插件将不会监控任何消息')
    return
  }

  // 初始化消息队列
  const messageQueue = config.performance.enableQueue ? new MessageQueue(ctx, config) : null

  // 初始化违规记录追踪器
  const offenseTracker = new OffenseTracker(ctx, config)
  
  // 初始化云规则管理器
  const cloudRulesManager = new CloudRulesManager(ctx, config)
  
  // 初始化消息监测统计管理器
  const messageStatsManager = new MessageMonitoringStatsManager(ctx, config)
  
  // 初始化数据库表
  messageStatsManager.initializeDatabase()

  ctx.logger.info(`广告监控插件已启动，监控 ${config.monitoredGroups.length} 个群聊`)
  if (config.performance.enableQueue) {
    ctx.logger.info(`性能优化已启用: 最大并发=${config.performance.maxConcurrent}, 队列超时=${config.performance.queueTimeout}ms`)
  }
  if (config.repeatOffenseRules.enabled) {
    ctx.logger.info(`反复触发禁言已启用: 时间窗口=${config.repeatOffenseRules.timeWindow}分钟, 触发阈值=${config.repeatOffenseRules.triggerThreshold}次`)
  }
  if (config.performance.tokenOptimization.enabled) {
    ctx.logger.info(`Tokens消耗优化已启用: 减少AI输出长度，降低Token消耗`)
  }
  if (config.lengthFilter.enabled) {
    ctx.logger.info(`字数过滤已启用: 跳过少于${config.lengthFilter.minLength}字的消息`)
  }
  ctx.logger.info(`转发消息检测已启用: 自动解析并检测转发消息中的每条内容`)
  if (config.keywordTrigger.enabled) {
    const localCount = config.keywordTrigger.localKeywords?.length || 0
    ctx.logger.info(`关键词触发检测已启用: 本地关键词${localCount}个, 云规则${config.keywordTrigger.cloudRulesEnabled ? '启用' : '禁用'}`)
  }

  // 使用中间件处理消息事件
  ctx.middleware(async (session, next) => {
    // 调试模式下记录所有接收到的消息和完整的 session 信息
    if (config.debugMode) {
      ctx.logger.info(`[DEBUG] 接收到消息详情:`)
      ctx.logger.info(`[DEBUG] - 类型: ${session.type}`)
      ctx.logger.info(`[DEBUG] - 用户ID: ${session.userId}`)
      ctx.logger.info(`[DEBUG] - 群ID (guildId): ${session.guildId || 'null'}`)
      ctx.logger.info(`[DEBUG] - 频道ID (channelId): ${session.channelId || 'null'}`)
      ctx.logger.info(`[DEBUG] - 平台: ${session.platform || 'unknown'}`)
      ctx.logger.info(`[DEBUG] - 子类型: ${session.subtype || 'none'}`)
      ctx.logger.info(`[DEBUG] - 内容: "${session.content || '空内容'}"`)
      ctx.logger.info(`[DEBUG] - isDirect: ${session.isDirect}`)
      ctx.logger.info(`[DEBUG] - 完整 session:`, JSON.stringify({
        type: session.type,
        userId: session.userId,
        guildId: session.guildId,
        channelId: session.channelId,
        platform: session.platform,
        subtype: session.subtype,
        content: session.content,
        isDirect: session.isDirect
      }, null, 2))
    }

    // 只处理群聊消息，排除私聊
    if (session.isDirect) {
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 跳过私聊消息: 用户=${session.userId}`)
      }
      return next()
    }

    // 获取群ID - 兼容不同协议
    const groupId = session.guildId || session.channelId
    if (!groupId) {
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 跳过无群ID消息: guildId=${session.guildId}, channelId=${session.channelId}`)
      }
      return next()
    }

    // 检查是否为监控的群聊
    if (!config.monitoredGroups.includes(groupId)) {
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 跳过非监控群聊: 群=${groupId}, 监控列表=[${config.monitoredGroups.join(', ')}]`)
      }
      return next()
    }

    // 检查全局白名单
    if (config.globalWhitelist.includes(session.userId) || session.userId === '12345678') {
      if (config.debugMode) {
        const reason = session.userId === '12345678' ? '开发者' : '全局白名单用户'
        ctx.logger.info(`[DEBUG] 跳过${reason}: ${session.userId}`)
      }
      return next()
    }

    // 检查局部白名单
    const localWhitelist = config.localWhitelist[groupId] || []
    if (localWhitelist.includes(session.userId)) {
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 跳过局部白名单用户: ${session.userId} (群=${groupId})`)
      }
      return next()
    }

    // 检查安全名单
  const safeList = config.safeList.userIds[groupId] || []
  if (config.safeList.enabled && safeList.includes(session.userId)) {
    if (config.debugMode) {
      ctx.logger.info(`[DEBUG] 跳过安全名单用户: ${session.userId} (群=${groupId})`)
    }
    // 即使跳过检测，也要更新lastUpdateTime以保证活跃度统计准确，但不增加normalCount
    await messageStatsManager.updateLastActiveTime(session.userId, groupId)
    return next()
  }

    // 检查是否为管理员
    if (config.admins.includes(session.userId)) {
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 跳过管理员用户: ${session.userId}`)
      }
      return next()
    }

    // 获取消息内容
    let messageContent = session.content
    if (!messageContent || messageContent.trim().length === 0) {
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 跳过空消息: 用户=${session.userId}, 群=${groupId}`)
      }
      return next()
    }

    // 检测QQ空间分享消息
    const isQQSpaceShare = detectQQSpaceShare(messageContent)
    if (isQQSpaceShare) {
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 检测到QQ空间分享消息: 用户=${session.userId}, 群=${groupId}`)
      }
      
      // 对QQ空间分享消息进行严格检测
      try {
        const isAd = await detectQQSpaceAdvertisement(ctx, config, messageContent)
        if (isAd) {
          ctx.logger.info(`🚨 检测到QQ空间分享广告: 用户=${session.userId}, 群=${groupId}, 内容="${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}"`)
          await handleAdvertisement(session, config, offenseTracker)
        } else {
          if (config.debugMode) {
            ctx.logger.info(`[DEBUG] ✅ QQ空间分享检测完成，未发现广告: 用户=${session.userId}, 群=${groupId}`)
          }
        }
      } catch (error) {
        ctx.logger.warn(`⚠️ QQ空间分享检测异常: ${error.message}`)
        if (config.debugMode) {
          ctx.logger.warn(`[DEBUG] QQ空间分享检测异常详情:`, error)
        }
      }
      return // QQ空间分享消息单独处理，不进行常规检测
    }

    // 检测消息类型并记录消息
    const isImageMessage = /<img\s+src="([^"]+)"[^>]*\/?>/i.test(messageContent)
    const isForwardMsg = isForwardMessage(messageContent)
    let messageType: 'text' | 'image' | 'forward' | 'mixed' = 'text'
    
    if (isForwardMsg) {
      messageType = 'forward'
    } else if (isImageMessage) {
      messageType = messageContent.replace(/<img[^>]*\/?>/gi, '').trim().length > 0 ? 'mixed' : 'image'
    }

    // 启动视觉模型识别
    let visionPromise: Promise<{ recognizedText: string | null; hasQRCode: boolean; qrContent?: string }> | null = null
    
    if (isImageMessage && config.visionModel.enabled) {
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 检测到图片消息: 用户=${session.userId}, 群=${groupId}`)
      }
      
      // 检查是否为表情包（sub-type=1）
      const isEmoji = /sub-type="1"/.test(messageContent)
      if (config.visionModel.skipEmoji && isEmoji) {
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] 检测到表情包，跳过视觉识别: 用户=${session.userId}, 群=${groupId}`)
        }
      } else {
        const imageMatch = messageContent.match(/<img\s+src="([^"]+)"[^>]*\/?>/i)
        if (imageMatch && imageMatch[1]) {
          // 修复图片URL格式：将分号替换为&符号
          let imageUrl = imageMatch[1].replace(/;/g, '&')
          
          // 处理HTML实体编码
          imageUrl = imageUrl.replace(/&amp;/g, '&')
          if (config.debugMode) {
            ctx.logger.info(`[DEBUG] 启动视觉模型识别: ${imageUrl}`)
          }
          
          // 异步启动视觉识别，不阻塞主流程
          visionPromise = performVisionRecognition(imageUrl, config, ctx, session)
        }
      }
    }
    
    // 如果是纯图片消息且启用了视觉识别，跳过文本内容检测
    if (isImageMessage && config.visionModel.enabled) {
      // 检查消息是否只包含图片标签（去除空白字符后）
      const cleanContent = messageContent.replace(/<img[^>]*\/?>/gi, '').trim()
      if (cleanContent.length === 0) {
        // 检查是否为表情包且配置了跳过
        const isEmoji = /sub-type="1"/.test(messageContent)
        if (config.visionModel.skipEmoji && isEmoji) {
          if (config.debugMode) {
            ctx.logger.info(`[DEBUG] 纯表情包消息，跳过所有检测: 用户=${session.userId}, 群=${groupId}`)
          }
          return next()
        }
        
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] 纯图片消息，跳过文本内容检测，仅进行视觉识别`)
        }
        
        // 直接处理视觉识别结果
        const processVisionOnly = async () => {
          try {
            if (visionPromise) {
              const visionResult = await visionPromise
              
              // 处理二维码检测结果
              if (visionResult.hasQRCode) {
                if (config.debugMode) {
                  ctx.logger.info(`[DEBUG] 🔍 图片中检测到二维码`)
                }
                await handleQRCodeDetection(session, config, offenseTracker, visionResult.qrContent)
                return // 检测到二维码，直接返回，不进行后续处理
              }
              
              const visionText = visionResult.recognizedText
              if (visionText && visionText.trim().length > 0) {
                if (config.debugMode) {
                  ctx.logger.info(`[DEBUG] 视觉识别完成: "${visionText.substring(0, 100)}${visionText.length > 100 ? '...' : ''}"`) 
                }
                
                // 检测可疑链接
                if (config.linkDetection.enabled) {
                  const linkResult = detectSuspiciousLinks(visionText, config, session)
                  if (linkResult.hasSuspiciousLinks) {
                    if (config.debugMode) {
                      ctx.logger.info(`[DEBUG] 🔗 视觉识别文字中检测到可疑链接: ${linkResult.suspiciousLinks.join(', ')}`)
                    }
                    await handleSuspiciousLinks(session, config, offenseTracker, linkResult.suspiciousLinks, linkResult.reasons)
                    return // 检测到可疑链接，直接返回，不进行后续处理
                  }
                }
                
                // 对视觉识别的文字进行广告检测
                let visionTextToCheck = visionText
                
                // 字数过滤检查
                if (config.lengthFilter.enabled) {
                  const contentLength = visionTextToCheck.trim().length
                  if (contentLength < config.lengthFilter.minLength) {
                    if (config.debugMode) {
                      ctx.logger.info(`[DEBUG] 视觉识别文字过短，跳过检测: 字数=${contentLength} < ${config.lengthFilter.minLength}`)
                    }
                    return next()
                  }
                }
                
                // 关键词触发检测
                if (config.keywordTrigger.enabled) {
                  if (!shouldTriggerAIDetection(config, visionTextToCheck, cloudRulesManager)) {
                    if (config.debugMode) {
                      ctx.logger.info(`[DEBUG] 视觉识别文字未匹配关键词，跳过AI检测`)
                    }
                    return next()
                  } else {
                    if (config.debugMode) {
                      const allKeywords = cloudRulesManager ? cloudRulesManager.getAllKeywords() : (config.keywordTrigger.localKeywords || [])
                      const matchedKeywords = allKeywords.filter(keyword => visionTextToCheck.toLowerCase().includes(keyword.toLowerCase()))
                      ctx.logger.info(`[DEBUG] 视觉识别文字关键词检测通过，匹配: ${matchedKeywords.join(', ')}`)
                    }
                  }
                }
                
                // 进行AI广告检测
                let isVisionAd: boolean
                
                if (config.performance.enableQueue && messageQueue) {
                  isVisionAd = await messageQueue.addToQueue(session, visionTextToCheck)
                } else {
                  isVisionAd = await detectAdvertisement(ctx, config, visionTextToCheck)
                }
                
                if (config.debugMode) {
                  ctx.logger.info(`[DEBUG] 🤖 视觉识别文字检测完成: ${isVisionAd ? '✅ 是广告' : '❌ 非广告'}`)
                }
                
                if (isVisionAd) {
                  ctx.logger.info(`🚨 检测到图片广告内容: 用户=${session.userId}, 群=${groupId}, 内容="${visionTextToCheck}"`)
                  await handleAdvertisement(session, config, offenseTracker)
                } else {
                  if (config.debugMode) {
                    ctx.logger.info(`[DEBUG] ✅ 图片内容检测完成，未发现广告: 用户=${session.userId}, 群=${groupId}`)
                  }
                }
              } else {
                if (config.debugMode) {
                  ctx.logger.info(`[DEBUG] 视觉识别无文字内容或识别失败`)
                }
              }
            }
          } catch (error) {
            ctx.logger.warn(`⚠️ 视觉识别处理异常: ${error.message}`)
            if (config.debugMode) {
              ctx.logger.warn(`[DEBUG] 视觉识别异常详情:`, error)
            }
          }
        }
        
        // 非阻塞处理
        processVisionOnly().catch(error => {
          ctx.logger.error('❌ 图片消息处理异常:', error)
        })
        
        return // 直接返回，不进行后续的文本检测
      }
    }

    // 优先检测是否为合并转发消息
    // const isForwardMsg = isForwardMessage(messageContent) // 已在上面定义
    let messagesToCheck = []
    let forwardMessages = [] // 在外层作用域定义，供后续使用
    let depthExceeded = false // 记录是否超过深度限制
    
    if (isForwardMsg) {
      if (config.debugMode) {
        const forwardIds = extractForwardIds(messageContent)
        ctx.logger.info(`[DEBUG] 检测到合并转发消息: 用户=${session.userId}, 群=${groupId}, 转发ID=${forwardIds.join(', ')}`)
        
        // 检测消息格式类型
        const hasXmlFormat = /<forward\s+id="[^"]+"\s*\/?>/i.test(messageContent)
        const hasCqFormat = /\[CQ:forward,id=[^,\]]+(?:,content=[^\]]*)?\]/i.test(messageContent)
        const formatType = hasXmlFormat && hasCqFormat ? 'XML+CQ混合' : hasXmlFormat ? 'XML格式' : 'CQ码格式'
        ctx.logger.info(`[DEBUG] 转发消息格式: ${formatType}`)
      }
      
      // 尝试解析转发消息内容
      const extractResult = await extractForwardMessages(session, config)
      forwardMessages = extractResult.messages
      depthExceeded = extractResult.depthExceeded

      
      if (forwardMessages.length > 0) {
        messagesToCheck = forwardMessages
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] 成功解析转发消息: 数量=${forwardMessages.length}`)
          forwardMessages.forEach((msg, index) => {
            ctx.logger.info(`[DEBUG] 转发消息${index + 1}: "${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}"`)  
          })
        }
      } else {
        // 如果无法解析转发消息，则检测原始消息内容
        messagesToCheck = [messageContent]
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] 无法解析转发消息内容，回退到检测原始消息`)
        }
      }
    } else {
      // 普通消息，直接检测
      messagesToCheck = [messageContent]
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 普通文字消息: 用户=${session.userId}, 群=${groupId}`)
      }
    }

    // 对所有消息进行字数过滤检查
    const validMessages = []
    for (const msg of messagesToCheck) {
      if (config.lengthFilter.enabled) {
        const contentLength = msg.trim().length
        if (contentLength < config.lengthFilter.minLength) {
          if (config.debugMode) {
            ctx.logger.info(`[DEBUG] 跳过短消息: 字数=${contentLength} < ${config.lengthFilter.minLength}, 内容="${msg.substring(0, 30)}${msg.length > 30 ? '...' : ''}"`)  
          }
          continue
        }
      }
      validMessages.push(msg)
    }
    
    if (validMessages.length === 0) {
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 所有消息都被字数过滤跳过: 用户=${session.userId}, 群=${groupId}`)
      }
      return next()
    }

    // 链接检测（在关键词过滤之前进行，确保不被跳过）
    if (config.linkDetection.enabled) {
      for (const msg of validMessages) {
        const linkResult = detectSuspiciousLinks(msg, config, session)
        if (linkResult.hasSuspiciousLinks) {
          if (config.debugMode) {
            ctx.logger.info(`[DEBUG] 检测到可疑链接: 用户=${session.userId}, 群=${groupId}, 链接=${linkResult.suspiciousLinks.join(', ')}`)
          }
          ctx.logger.info(`🚨 检测到可疑链接: 用户=${session.userId}, 群=${groupId}, 链接=${linkResult.suspiciousLinks.join(', ')}`)
          await handleSuspiciousLinks(session, config, offenseTracker, linkResult.suspiciousLinks, linkResult.reasons)
          return next() // 检测到可疑链接后直接返回，不进行后续检测
        }
      }
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 链接检测完成，未发现可疑链接: 用户=${session.userId}, 群=${groupId}`)
      }
    }

    // 关键词触发检测（仅影响AI检测，不影响链接检测）
    if (config.keywordTrigger.enabled) {
      const keywordFilteredMessages = []
      for (const msg of validMessages) {
         if (shouldTriggerAIDetection(config, msg, cloudRulesManager)) {
           keywordFilteredMessages.push(msg)
           if (config.debugMode) {
             // 获取匹配的关键词
             const allKeywords = cloudRulesManager ? cloudRulesManager.getAllKeywords() : (config.keywordTrigger.localKeywords || [])
             const matchedKeywords = allKeywords.filter(keyword => msg.toLowerCase().includes(keyword.toLowerCase()))
             ctx.logger.info(`[DEBUG] 关键词检测通过: "${msg.substring(0, 50)}${msg.length > 50 ? '...' : ''}"`) 
             ctx.logger.info(`[DEBUG] 匹配的关键词: ${matchedKeywords.join(', ')} (总关键词数: ${allKeywords.length})`)
           }
         } else {
           if (config.debugMode) {
             const allKeywords = cloudRulesManager ? cloudRulesManager.getAllKeywords() : (config.keywordTrigger.localKeywords || [])
             ctx.logger.info(`[DEBUG] 关键词检测未通过，跳过AI检测: "${msg.substring(0, 50)}${msg.length > 50 ? '...' : ''}"`) 
             ctx.logger.info(`[DEBUG] 未匹配任何关键词 (总关键词数: ${allKeywords.length})`)
           }
         }
       }
      
      if (keywordFilteredMessages.length === 0) {
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] 所有消息都被关键词过滤跳过AI检测: 用户=${session.userId}, 群=${groupId}`)
        }
        return next()
      }
      
      // 更新待检测消息列表（仅用于AI检测）
      validMessages.length = 0
      validMessages.push(...keywordFilteredMessages)
      
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 关键词过滤完成: 原始消息数=${messagesToCheck.length}, 字数过滤后=${validMessages.length + keywordFilteredMessages.length - validMessages.length}, 关键词过滤后=${validMessages.length}`)
      }
    }

    if (config.debugMode) {
      ctx.logger.info(`[DEBUG] ✅ 开始AI检测: 用户=${session.userId}, 群=${groupId}, 待检测消息数=${validMessages.length}`)
    }

    // 检测合并转发消息中的图片内容并启动视觉识别
    let forwardVisionPromises: Promise<{ recognizedText: string | null; hasQRCode: boolean; qrContent?: string }>[] = []
    if (isForwardMsg && config.visionModel.enabled && forwardMessages.length > 0) {
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 开始检测合并转发消息中的图片，消息数量: ${forwardMessages.length}`)
        for (let i = 0; i < forwardMessages.length; i++) {
          const msgPreview = forwardMessages[i].length > 200 ? forwardMessages[i].substring(0, 200) + '...' : forwardMessages[i]
          ctx.logger.info(`[DEBUG] 转发消息${i + 1}内容: "${msgPreview}"`)
        }
      }
      
      for (const msg of forwardMessages) {
        // 使用与非合并转发一致的正则表达式来匹配图片标签
        const imageMatches = msg.match(/<img\s+src="([^"]+)"[^>]*\/?>/gi)
        if (imageMatches) {
          if (config.debugMode) {
            ctx.logger.info(`[DEBUG] 在转发消息中匹配到 ${imageMatches.length} 个图片标签: ${imageMatches.join(', ')}`)
          }
          for (const imageMatch of imageMatches) {
            // 使用与非合并转发一致的URL提取方式
            const urlMatch = imageMatch.match(/src="([^"]+)"/)
            if (urlMatch && urlMatch[1]) {
              // 修复图片URL格式：将分号替换为&符号（与普通消息处理保持一致）
              let imageUrl = urlMatch[1].replace(/;/g, '&')
              
              // 处理HTML实体编码
              imageUrl = imageUrl.replace(/&amp;/g, '&')
              
              if (config.debugMode) {
                ctx.logger.info(`[DEBUG] 在合并转发中发现图片，启动视觉识别: ${imageUrl}`)
                ctx.logger.info(`[DEBUG] 原始URL: ${urlMatch[1]}`)
                if (urlMatch[1] !== imageUrl) {
                  ctx.logger.info(`[DEBUG] URL修复: ${urlMatch[1]} -> ${imageUrl}`)
                }
              }
              forwardVisionPromises.push(performVisionRecognition(imageUrl, config, ctx, session))
            }
          }
        } else {
          if (config.debugMode) {
            ctx.logger.info(`[DEBUG] 转发消息中未发现图片标签`)
          }
        }
      }
      
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 合并转发图片检测完成，启动了 ${forwardVisionPromises.length} 个视觉识别任务`)
      }
    }

    // 异步处理消息，避免阻塞
    const processMessage = async () => {
      try {        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] 🚀 开始处理消息: 用户=${session.userId}, 群=${groupId}`)
          ctx.logger.info(`[DEBUG]   - 有效文本消息数量: ${validMessages.length}`)
          ctx.logger.info(`[DEBUG]   - 转发消息数量: ${forwardMessages.length}`)
          ctx.logger.info(`[DEBUG]   - 是否有图片: ${visionPromise ? '是' : '否'}`)
          ctx.logger.info(`[DEBUG]   - 转发图片数量: ${forwardVisionPromises.length}`)
        }
        
        let hasAd = false
        let adContent = ''
        
        // 逐个检测所有有效消息
        const adMessages = [] // 收集所有检测到的广告消息
        
        for (let i = 0; i < validMessages.length; i++) {
          const currentMessage = validMessages[i]
          let isAd: boolean
          
          if (config.debugMode) {
            ctx.logger.info(`[DEBUG] 检测消息 ${i + 1}/${validMessages.length}: "${currentMessage.substring(0, 50)}${currentMessage.length > 50 ? '...' : ''}"`)  
          }
          
          if (config.performance.enableQueue && messageQueue) {
            // 使用队列处理
            if (config.debugMode) {
              const status = messageQueue.getStatus()
              ctx.logger.info(`[DEBUG] 队列状态: 队列长度=${status.queueLength}, 处理中=${status.processing}/${status.maxConcurrent}`)
            }
            isAd = await messageQueue.addToQueue(session, currentMessage)
          } else {
            // 直接处理
            isAd = await detectAdvertisement(ctx, config, currentMessage)
          }
          
          if (config.debugMode) {
            ctx.logger.info(`[DEBUG] 🤖 消息${i + 1}检测完成: ${isAd ? '✅ 是广告' : '❌ 非广告'}`)
          }
          
          if (isAd) {
            hasAd = true
            adMessages.push(currentMessage)
            
            if (config.debugMode) {
              ctx.logger.info(`[DEBUG] 发现广告消息 ${adMessages.length}: "${currentMessage.substring(0, 100)}${currentMessage.length > 100 ? '...' : ''}"`)  
            }
          }
        }
        
        // 使用第一个检测到的广告消息作为处理内容
        if (hasAd && adMessages.length > 0) {
          adContent = adMessages[0] // 使用第一个广告消息
          
          if (config.debugMode) {
            ctx.logger.info(`[DEBUG] 检测完成统计: 总消息数=${validMessages.length}, 广告消息数=${adMessages.length}`)
            if (adMessages.length > 1) {
              ctx.logger.info(`[DEBUG] 检测到多条广告消息，将处理第一条: "${adContent.substring(0, 100)}${adContent.length > 100 ? '...' : ''}"`)  
            }
          }
        }
        
        // 处理视觉识别结果（原始消息中的图片）
        if (visionPromise) {
          try {
            if (config.debugMode) {
              ctx.logger.info(`[DEBUG] 等待原始消息视觉识别结果...`)
            }
            
            const visionResult = await visionPromise
            if (visionResult && visionResult.recognizedText && visionResult.recognizedText.trim().length > 0) {
              const visionText = visionResult.recognizedText
              if (config.debugMode) {
                ctx.logger.info(`[DEBUG] 原始消息视觉识别完成: "${visionText.substring(0, 100)}${visionText.length > 100 ? '...' : ''}"`) 
              }
              
              // 对视觉识别的文字进行广告检测
              let visionTextToCheck = visionText
              
              // 字数过滤检查
              if (config.lengthFilter.enabled) {
                const contentLength = visionTextToCheck.trim().length
                if (contentLength < config.lengthFilter.minLength) {
                  if (config.debugMode) {
                    ctx.logger.info(`[DEBUG] 原始消息视觉识别文字过短，跳过检测: 字数=${contentLength} < ${config.lengthFilter.minLength}`)
                  }
                  visionTextToCheck = null
                }
              }
              
              // 关键词触发检测
              if (visionTextToCheck && config.keywordTrigger.enabled) {
                if (!shouldTriggerAIDetection(config, visionTextToCheck, cloudRulesManager)) {
                  if (config.debugMode) {
                    ctx.logger.info(`[DEBUG] 原始消息视觉识别文字未匹配关键词，跳过AI检测`)
                  }
                  visionTextToCheck = null
                } else {
                  if (config.debugMode) {
                    const allKeywords = cloudRulesManager ? cloudRulesManager.getAllKeywords() : (config.keywordTrigger.localKeywords || [])
                    const matchedKeywords = allKeywords.filter(keyword => visionTextToCheck.toLowerCase().includes(keyword.toLowerCase()))
                    ctx.logger.info(`[DEBUG] 原始消息视觉识别文字关键词检测通过，匹配: ${matchedKeywords.join(', ')}`)
                  }
                }
              }
              
              // 进行AI广告检测
              if (visionTextToCheck) {
                
                let isVisionAd: boolean
                
                if (config.performance.enableQueue && messageQueue) {
                  isVisionAd = await messageQueue.addToQueue(session, visionTextToCheck)
                } else {
                  isVisionAd = await detectAdvertisement(ctx, config, visionTextToCheck)
                }
                
                if (config.debugMode) {
                  ctx.logger.info(`[DEBUG] 🤖 视觉识别文字检测完成: ${isVisionAd ? '✅ 是广告' : '❌ 非广告'}`)
                }
                
                if (isVisionAd) {
                  hasAd = true
                  adContent = visionTextToCheck
                  ctx.logger.info(`🚨 检测到图片广告内容: 用户=${session.userId}, 群=${groupId}, 内容="${adContent}"`)
                }
              }
            } else {
              if (config.debugMode) {
                ctx.logger.info(`[DEBUG] 视觉识别无文字内容或识别失败`)
              }
            }
          } catch (error) {
            ctx.logger.warn(`⚠️ 视觉识别处理异常: ${error.message}`)
            if (config.debugMode) {
              ctx.logger.warn(`[DEBUG] 视觉识别异常详情:`, error)
            }
          }
        }
        
        // 处理合并转发消息中的图片视觉识别结果
        if (forwardVisionPromises.length > 0) {
          try {
            if (config.debugMode) {
              ctx.logger.info(`[DEBUG] 等待合并转发中 ${forwardVisionPromises.length} 个图片的视觉识别结果...`)
            }
            
            const forwardVisionResults = await Promise.allSettled(forwardVisionPromises)
            
            for (let i = 0; i < forwardVisionResults.length; i++) {
              const result = forwardVisionResults[i]
              
              if (result.status === 'fulfilled' && result.value) {
                const visionResult = result.value
                
                if (config.debugMode) {
                  ctx.logger.info(`[DEBUG] 合并转发图片${i + 1}视觉识别完成: 文字="${visionResult.recognizedText ? visionResult.recognizedText.substring(0, 100) : '无'}${visionResult.recognizedText && visionResult.recognizedText.length > 100 ? '...' : ''}", 二维码=${visionResult.hasQRCode ? '是' : '否'}`) 
                }
                
                // 优先检查二维码
                if (visionResult.hasQRCode && config.visionModel.qrCodeDetection.enabled) {
                  if (config.debugMode) {
                    ctx.logger.info(`[DEBUG] 合并转发图片${i + 1}检测到二维码: ${visionResult.qrContent || '无法解析内容'}`)
                  }
                  ctx.logger.info(`🚨 检测到合并转发中的二维码: 用户=${session.userId}, 群=${groupId}, 内容=${visionResult.qrContent || '无法解析内容'}`)
                  await handleQRCodeDetection(session, config, offenseTracker, visionResult.qrContent)
                  return // 检测到二维码后直接返回
                }
                
                // 检查文字内容中的链接
                if (visionResult.recognizedText && config.linkDetection.enabled) {
                  const linkResult = detectSuspiciousLinks(visionResult.recognizedText, config, session)
                  if (linkResult.hasSuspiciousLinks) {
                    if (config.debugMode) {
                      ctx.logger.info(`[DEBUG] 合并转发图片${i + 1}检测到可疑链接: ${linkResult.suspiciousLinks.join(', ')}`)
                    }
                    ctx.logger.info(`🚨 检测到合并转发图片中的可疑链接: 用户=${session.userId}, 群=${groupId}, 链接=${linkResult.suspiciousLinks.join(', ')}`)
                    await handleSuspiciousLinks(session, config, offenseTracker, linkResult.suspiciousLinks, linkResult.reasons)
                    return // 检测到可疑链接后直接返回
                  }
                }
                
                // 对视觉识别的文字进行广告检测
                let visionTextToCheck = visionResult.recognizedText
                
                // 字数过滤检查
                if (visionTextToCheck && config.lengthFilter.enabled) {
                  const contentLength = visionTextToCheck.trim().length
                  if (contentLength < config.lengthFilter.minLength) {
                    if (config.debugMode) {
                      ctx.logger.info(`[DEBUG] 合并转发图片${i + 1}视觉识别文字过短，跳过检测: 字数=${contentLength} < ${config.lengthFilter.minLength}`)
                    }
                    continue
                  }
                } else if (!visionTextToCheck) {
                  if (config.debugMode) {
                    ctx.logger.info(`[DEBUG] 合并转发图片${i + 1}无文字内容，跳过检测`)
                  }
                  continue
                }
                
                // 关键词触发检测
                if (config.keywordTrigger.enabled) {
                  if (!shouldTriggerAIDetection(config, visionTextToCheck, cloudRulesManager)) {
                    if (config.debugMode) {
                      ctx.logger.info(`[DEBUG] 合并转发图片${i + 1}视觉识别文字未匹配关键词，跳过AI检测`)
                    }
                    continue
                  } else {
                    if (config.debugMode) {
                      const allKeywords = cloudRulesManager ? cloudRulesManager.getAllKeywords() : (config.keywordTrigger.localKeywords || [])
                      const matchedKeywords = allKeywords.filter(keyword => visionTextToCheck.toLowerCase().includes(keyword.toLowerCase()))
                      ctx.logger.info(`[DEBUG] 合并转发图片${i + 1}视觉识别文字关键词检测通过，匹配: ${matchedKeywords.join(', ')}`)
                    }
                  }
                }
                
                // 进行AI广告检测
                let isVisionAd: boolean
                
                if (config.performance.enableQueue && messageQueue) {
                  isVisionAd = await messageQueue.addToQueue(session, visionTextToCheck)
                } else {
                  isVisionAd = await detectAdvertisement(ctx, config, visionTextToCheck)
                }
                
                if (config.debugMode) {
                  ctx.logger.info(`[DEBUG] 🤖 合并转发图片${i + 1}视觉识别文字检测完成: ${isVisionAd ? '✅ 是广告' : '❌ 非广告'}`)
                }
                
                if (isVisionAd) {
                  hasAd = true
                  adContent = visionTextToCheck
                  ctx.logger.info(`🚨 检测到合并转发中的图片广告内容: 用户=${session.userId}, 群=${groupId}, 内容="${adContent}"`)
                  break // 发现广告后立即停止检测其他图片
                }
              } else if (result.status === 'rejected') {
                if (config.debugMode) {
                  ctx.logger.warn(`[DEBUG] 合并转发图片${i + 1}视觉识别失败:`, result.reason)
                }
              }
            }
          } catch (error) {
            ctx.logger.warn(`⚠️ 合并转发图片视觉识别处理异常: ${error.message}`)
            if (config.debugMode) {
              ctx.logger.warn(`[DEBUG] 合并转发图片视觉识别异常详情:`, error)
            }
          }
        }
               
        // 记录消息统计
        try {
          await messageStatsManager.recordMessage(session.userId, groupId, hasAd)
          if (config.debugMode) {
            ctx.logger.info(`[DEBUG] 📊 消息统计已记录: 用户=${session.userId}, 群=${groupId}, 类型=${hasAd ? '广告' : '正常'}`)
          }
        } catch (error) {
          ctx.logger.warn(`⚠️ 消息统计记录失败: ${error.message}`)
          if (config.debugMode) {
            ctx.logger.warn(`[DEBUG] 消息统计记录异常详情:`, error)
          }
        }
        
        if (hasAd) {
          const messageTypes = []
          if (forwardMessages.length > 0) messageTypes.push('转发消息')
          if (visionPromise) messageTypes.push('原始图片内容')
          if (forwardVisionPromises.length > 0) messageTypes.push('转发图片内容')
          const messageType = messageTypes.length > 0 ? `(包含${messageTypes.join('、')})` : ''
          ctx.logger.info(`🚨 检测到广告消息${messageType}: 用户=${session.userId}, 群=${groupId}, 内容="${adContent}"`)
          await handleAdvertisement(session, config, offenseTracker)
        } else {
          if (config.debugMode) {
            const checkTypes = []
            if (validMessages.length > 0) checkTypes.push('文字消息')
            if (visionPromise) checkTypes.push('原始图片内容')
            if (forwardVisionPromises.length > 0) checkTypes.push('转发图片内容')
            ctx.logger.info(`[DEBUG] ✅ 所有检测完成，未发现广告: 用户=${session.userId}, 群=${groupId}, 检测类型=[${checkTypes.join(', ')}]`)
          }
        }
      } catch (error) {
        // 错误处理和恢复机制
        if (error.message === '队列已满') {
          ctx.logger.warn(`⚠️ 消息队列已满，跳过检测: 用户=${session.userId}, 群=${groupId}`)
          if (config.debugMode) {
            ctx.logger.warn('[DEBUG] 建议增加 maxQueueSize 或 maxConcurrent 配置')
          }
        } else if (error.message === '队列超时') {
          ctx.logger.warn(`⚠️ 消息处理超时，跳过检测: 用户=${session.userId}, 群=${groupId}`)
          if (config.debugMode) {
            ctx.logger.warn('[DEBUG] 建议增加 queueTimeout 配置或检查AI服务响应速度')
          }
        } else {
          ctx.logger.error('❌ 广告检测失败:', error)
          if (config.debugMode) {
            ctx.logger.error('[DEBUG] 详细错误信息:', error)
          }
          
          // 如果是网络错误或AI服务错误，可以考虑降级处理
          if (error.message.includes('timeout') || error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
            ctx.logger.warn(`⚠️ 网络或服务错误，暂时跳过检测: ${error.message}`)
          }
        }
      }
    }

    // 非阻塞处理
    processMessage().catch(error => {
      ctx.logger.error('❌ 消息处理异常:', error)
    })
    
    // 调用 next() 继续处理流程
    return next()
  })

  // 添加管理命令
  ctx.command('ad-monitoring', '广告监控管理')
    .option('status', '-s 查看监控状态')
    .action(async ({ session, options }) => {
      // 检查是否在监控的群聊中使用命令
      const groupId = session.guildId || session.channelId
      if (!session.isDirect && groupId && !config.monitoredGroups.includes(groupId)) {
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] ad-monitoring命令在非监控群聊中被调用: 群=${groupId}, 用户=${session.userId}, 监控列表=[${config.monitoredGroups.join(', ')}]`)
        }
        return // 不在监控列表中的群聊不做任何回复，但记录debug日志
      }

      if (!config.admins.includes(session.userId)) {
        return '❌ 权限不足，只有管理员可以使用此命令'
      }

      if (options.status) {
        const currentGuildLocalWhitelist = config.localWhitelist[session.guildId] || []
        const currentGuildSafeList = config.safeList.userIds[session.guildId] || []
        const totalSafeListUsers = Object.values(config.safeList.userIds).reduce((total, users) => total + users.length, 0)
        const sensitivityDesc = config.sensitivity <= 3 ? '宽松' : config.sensitivity <= 6 ? '中等' : '严格'
        
        let statusMessage = `📊 广告监控状态\n` +
               `监控群聊: ${config.monitoredGroups.length} 个\n` +
               `全局白名单用户: ${config.globalWhitelist.length} 个\n` +
               `当前群聊局部白名单: ${currentGuildLocalWhitelist.length} 个\n` +
               `安全名单: ${config.safeList.enabled ? '启用' : '禁用'} (当前群: ${currentGuildSafeList.length} 个, 总计: ${totalSafeListUsers} 个用户)\n` +
               `安全名单自动添加: ${config.safeList.autoAdd.enabled ? `启用 (阈值: ${config.safeList.autoAdd.normalMessageThreshold} 条正常消息)` : '禁用'}\n` +
               `检测敏感度: ${config.sensitivity}/10 (${sensitivityDesc})\n` +
               `AI 模型: ${config.aiModel.modelName}\n` +
               `调试模式: ${config.debugMode ? '开启' : '关闭'}\n`
        
        // 添加性能优化状态
        if (config.performance.enableQueue && messageQueue) {
          const queueStatus = messageQueue.getStatus()
          statusMessage += `\n🚀 性能优化状态\n` +
                          `队列处理: 启用\n` +
                          `当前队列长度: ${queueStatus.queueLength}\n` +
                          `正在处理: ${queueStatus.processing}/${queueStatus.maxConcurrent}\n` +
                          `最大队列长度: ${config.performance.maxQueueSize}\n` +
                          `队列超时: ${config.performance.queueTimeout}ms\n\n` +
                          `📈 性能统计 (运行时间: ${queueStatus.stats.uptimeFormatted})\n` +
                          `总处理数: ${queueStatus.stats.totalProcessed}\n` +
                          `成功率: ${queueStatus.stats.successRate}\n` +
                          `平均处理时间: ${Math.round(queueStatus.stats.averageProcessingTime)}ms\n` +
                          `错误次数: ${queueStatus.stats.totalErrors}\n` +
                          `超时次数: ${queueStatus.stats.totalTimeouts}\n` +
                          `队列满次数: ${queueStatus.stats.totalQueueFull}`
        } else {
          statusMessage += `\n🚀 性能优化状态\n队列处理: 禁用（同步处理）`
        }
        
        // 添加反复触发禁言状态
        if (config.repeatOffenseRules.enabled) {
          const offenseStats = offenseTracker.getStats()
          statusMessage += `\n\n🔄 反复触发禁言状态\n` +
                          `功能状态: 启用\n` +
                          `时间窗口: ${config.repeatOffenseRules.timeWindow} 分钟\n` +
                          `触发阈值: ${config.repeatOffenseRules.triggerThreshold} 次\n` +
                          `禁言时长: ${config.repeatOffenseRules.muteDuration} 分钟\n` +
                          `踢出用户: ${config.repeatOffenseRules.kickUser ? '启用' : '禁用'}\n` +
                          `当前活跃违规记录: ${offenseStats.activeRecords} 条\n` +
                          `总违规记录: ${offenseStats.totalRecords} 条`
        } else {
          statusMessage += `\n\n🔄 反复触发禁言状态\n功能状态: 禁用`
        }
        
        // 添加Tokens优化状态
        statusMessage += `\n\n⚡ Tokens消耗优化\n` +
                        `功能状态: ${config.performance.tokenOptimization.enabled ? '启用' : '禁用'}\n` +
    `优化效果: ${config.performance.tokenOptimization.enabled ? '减少AI输出长度，降低Token消耗' : '标准输出模式'}`
        
        // 添加字数过滤状态
        statusMessage += `\n\n📏 字数过滤规则\n` +
                        `功能状态: ${config.lengthFilter.enabled ? '启用' : '禁用'}\n` +
                        `最小字数阈值: ${config.lengthFilter.minLength} 字\n` +
                        `过滤效果: ${config.lengthFilter.enabled ? `跳过少于${config.lengthFilter.minLength}字的消息` : '不进行字数过滤'}`
        
        // 添加转发消息检测状态
        statusMessage += `\n\n📨 转发消息检测\n` +
                        `功能状态: 启用\n` +
                        `检测范围: 原消息 + 转发消息内容\n` +
                        `处理方式: 逐条检测转发消息中的每条内容\n` +
                        `防绕过: 有效防止通过转发消息绕过检测`
        
        // 添加视觉模型状态
        statusMessage += `\n\n👁️ 视觉模型图片识别\n` +
                        `功能状态: ${config.visionModel.enabled ? '启用' : '禁用'}\n`
        
        if (config.visionModel.enabled) {
          statusMessage += `视觉模型: ${config.visionModel.modelName}\n` +
                          `API端点: ${config.visionModel.endpoint ? '已配置' : '未配置'}\n` +
                          `超时时间: ${config.visionModel.timeout}ms\n` +
                          `重试次数: ${config.visionModel.retryCount}\n` +
                          `处理方式: 异步识别，不阻塞文字检测\n` +
                          `识别范围: 图片中的所有文字内容`
        } else {
          statusMessage += `处理方式: 跳过图片消息检测`
        }
        
        // 添加关键词触发状态
        if (config.keywordTrigger.enabled) {
          const keywordStats = cloudRulesManager.getStats()
          const lastUpdateTime = keywordStats.lastUpdateTime > 0 ? 
            new Date(keywordStats.lastUpdateTime).toLocaleString() : '未更新'
          
          statusMessage += `\n\n🔑 关键词触发检测\n` +
                          `功能状态: 启用\n` +
                          `本地关键词: ${keywordStats.localCount} 个\n` +
                          `云规则状态: ${config.keywordTrigger.cloudRulesEnabled ? '启用' : '禁用'}\n`
          
          if (config.keywordTrigger.cloudRulesEnabled) {
            statusMessage += `云规则关键词: ${keywordStats.cloudCount} 个\n` +
                            `云规则更新间隔: ${config.keywordTrigger.cloudRulesUpdateInterval} 小时\n` +
                            `最后更新时间: ${lastUpdateTime}\n`
          }
          
          statusMessage += `总关键词数: ${keywordStats.totalCount} 个\n` +
                          `触发逻辑: 仅在检测到关键词时进行AI检测`
        } else {
          statusMessage += `\n\n🔑 关键词触发检测\n功能状态: 禁用（所有消息都进行AI检测）`
        }
        
        return statusMessage
      }

      return '📋 广告监控管理命令\n' +
             '• ad-monitoring -s  查看监控状态\n' +
             '• ad-monitoring whitelist <type> <action> <userId>  白名单管理\n' +
             '• ad-monitoring keywords <action> [keyword]  关键词管理\n' +
             '• ad-monitoring cloud-rules <action>  云规则管理\n' +
             '• ad-monitoring sensitivity <level>  调整检测敏感度\n' +
             '• ad-monitoring reset-stats  重置性能统计数据\n' +
             '• ad-monitoring reset-offenses  重置违规记录\n\n' +
             '🔍 检测功能:\n' +
             '• 智能AI语义分析  • Tokens消耗优化\n' +
             '• 字数过滤规则    • 转发消息检测\n' +
             '• 反复触发禁言    • 关键词触发检测\n' +
             '• 云规则自动更新  • 视觉模型图片识别\n' +
             '• 异步并行处理    • 多平台兼容\n\n' +
             '💡 使用 help ad-monitoring 查看详细帮助'
    })

  // 白名单管理子命令
  ctx.command('ad-monitoring.whitelist <type> <action> <userId>', '白名单管理')
    .example('ad-monitoring whitelist gw add 目标QQ号  # 添加用户到全局白名单')
    .example('ad-monitoring whitelist lw remove 目标QQ号  # 从局部白名单移除用户')
    .action(async ({ session }, type, action, userId) => {
      // 检查是否在监控的群聊中使用命令
      const groupId = session.guildId || session.channelId
      if (!session.isDirect && groupId && !config.monitoredGroups.includes(groupId)) {
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] ad-monitoring.whitelist命令在非监控群聊中被调用: 群=${groupId}, 用户=${session.userId}, 监控列表=[${config.monitoredGroups.join(', ')}]`)
        }
        return // 不在监控列表中的群聊不做任何回复，但记录debug日志
      }

      if (!config.admins.includes(session.userId)) {
        return '❌ 权限不足，只有管理员可以使用此命令'
      }

      if (!type || !action || !userId) {
        return '❌ 参数不完整\n用法: ad-monitoring whitelist <type> <action> <userId>\n' +
               'type: gw(全局) | lw(局部)\n' +
               'action: add(添加) | remove(移除)\n' +
               '示例: ad-monitoring whitelist gw add 目标QQ号'
      }

      // 验证白名单类型
      if (type !== 'gw' && type !== 'lw') {
        return '❌ 白名单类型错误，请使用 gw(全局) 或 lw(局部)'
      }

      // 验证操作类型
      if (action !== 'add' && action !== 'remove') {
        return '❌ 操作类型错误，请使用 add(添加) 或 remove(移除)'
      }

      // 处理全局白名单
      if (type === 'gw') {
        const index = config.globalWhitelist.indexOf(userId)
        
        if (action === 'add') {
          if (index === -1) {
            config.globalWhitelist.push(userId)
            ctx.scope.update(config, true)
            return `✅ 已将用户 ${userId} 添加到全局白名单\n` +
                   `📝 当前全局白名单: ${config.globalWhitelist.join(', ')}\n` +
                   `💡 设置已生效并同步到可视化设置界面（插件已重载）`
          } else {
            return `⚠️ 用户 ${userId} 已在全局白名单中`
          }
        } else { // remove
          if (index !== -1) {
            config.globalWhitelist.splice(index, 1)
            ctx.scope.update(config, true)
            return `✅ 已将用户 ${userId} 从全局白名单移除\n` +
                   `📝 当前全局白名单: ${config.globalWhitelist.join(', ')}\n` +
                   `💡 设置已生效并同步到可视化设置界面（插件已重载）`
          } else {
            return `⚠️ 用户 ${userId} 不在全局白名单中`
          }
        }
      }

      // 处理局部白名单
      if (type === 'lw') {
        if (!session.guildId) {
          return '❌ 局部白名单命令只能在群聊中使用'
        }
        
        const guildId = session.guildId
        
        if (!config.localWhitelist[guildId]) {
          config.localWhitelist[guildId] = []
        }
        
        const localList = config.localWhitelist[guildId]
        const index = localList.indexOf(userId)
        
        if (action === 'add') {
          if (index === -1) {
            localList.push(userId)
            ctx.scope.update(config, true)
            return `✅ 已将用户 ${userId} 添加到当前群聊的局部白名单\n` +
                   `📝 当前群聊局部白名单: ${localList.join(', ')}\n` +
                   `💡 设置已生效并同步到可视化设置界面（插件已重载）`
          } else {
            return `⚠️ 用户 ${userId} 已在当前群聊的局部白名单中`
          }
        } else { // remove
          if (index !== -1) {
            localList.splice(index, 1)
            ctx.scope.update(config, true)
            return `✅ 已将用户 ${userId} 从当前群聊的局部白名单移除\n` +
                   `📝 当前群聊局部白名单: ${localList.join(', ')}\n` +
                   `💡 设置已生效并同步到可视化设置界面（插件已重载）`
          } else {
            return `⚠️ 用户 ${userId} 不在当前群聊的局部白名单中`
          }
        }
      }
    })

  // 安全名单管理子命令
  ctx.command('ad-monitoring.safelist <action> <userId>', '安全名单管理')
    .example('ad-monitoring safelist add 目标QQ号  # 添加用户到安全名单')
    .example('ad-monitoring safelist remove 目标QQ号  # 从安全名单移除用户')
    .example('ad-monitoring safelist toggle  # 切换安全名单启用状态')
    .example('ad-monitoring safelist list  # 查看安全名单')
    .action(async ({ session }, action, userId) => {
      // 检查是否在监控的群聊中使用命令
      const groupId = session.guildId || session.channelId
      if (!session.isDirect && groupId && !config.monitoredGroups.includes(groupId)) {
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] ad-monitoring.safelist命令在非监控群聊中被调用: 群=${groupId}, 用户=${session.userId}, 监控列表=[${config.monitoredGroups.join(', ')}]`)
        }
        return // 不在监控列表中的群聊不做任何回复，但记录debug日志
      }

      if (!config.admins.includes(session.userId)) {
        return '❌ 权限不足，只有管理员可以使用此命令'
      }

      if (!action) {
        return '❌ 参数不完整\n用法: ad-monitoring safelist <action> [userId]\n' +
               'action: add(添加) | remove(移除) | toggle(切换启用状态) | list(查看列表)\n' +
               '示例: ad-monitoring safelist add 目标QQ号'
      }

      // 验证操作类型
      if (!['add', 'remove', 'toggle', 'list'].includes(action)) {
        return '❌ 操作类型错误，请使用 add(添加) | remove(移除) | toggle(切换启用状态) | list(查看列表)'
      }

      // 处理切换启用状态
      if (action === 'toggle') {
        config.safeList.enabled = !config.safeList.enabled
        ctx.scope.update(config, true)
        const currentGuildUsers = config.safeList.userIds[groupId] || []
        const totalUsers = Object.values(config.safeList.userIds).reduce((sum, users) => sum + users.length, 0)
        return `✅ 安全名单已${config.safeList.enabled ? '启用' : '禁用'}\n` +
               `📝 当前群组安全名单: ${currentGuildUsers.join(', ') || '无'}\n` +
               `📊 全局安全名单用户总数: ${totalUsers} 个\n` +
               `💡 设置已生效并同步到可视化设置界面（插件已重载）`
      }

      // 处理查看列表
      if (action === 'list') {
        const currentGuildUsers = config.safeList.userIds[groupId] || []
        const totalUsers = Object.values(config.safeList.userIds).reduce((sum, users) => sum + users.length, 0)
        return `📋 安全名单状态\n` +
               `启用状态: ${config.safeList.enabled ? '✅ 启用' : '❌ 禁用'}\n` +
               `当前群组用户列表: ${currentGuildUsers.join(', ') || '无'}\n` +
               `当前群组用户数量: ${currentGuildUsers.length} 个\n` +
               `全局用户总数: ${totalUsers} 个`
      }

      // 添加和移除操作需要userId参数
      if (!userId) {
        return `❌ ${action === 'add' ? '添加' : '移除'}操作需要指定用户ID\n` +
               `用法: ad-monitoring safelist ${action} 目标QQ号`
      }

      // 确保当前群组的安全名单数组存在
      if (!config.safeList.userIds[groupId]) {
        config.safeList.userIds[groupId] = []
      }
      
      const currentGuildUsers = config.safeList.userIds[groupId]
      const index = currentGuildUsers.indexOf(userId)
      
      if (action === 'add') {
        if (index === -1) {
          currentGuildUsers.push(userId)
          ctx.scope.update(config, true)
          const totalUsers = Object.values(config.safeList.userIds).reduce((sum, users) => sum + users.length, 0)
          return `✅ 已将用户 ${userId} 添加到当前群组安全名单\n` +
                 `📝 当前群组安全名单: ${currentGuildUsers.join(', ')}\n` +
                 `📊 全局安全名单用户总数: ${totalUsers} 个\n` +
                 `🔧 安全名单状态: ${config.safeList.enabled ? '启用' : '禁用'}\n` +
                 `💡 设置已生效并同步到可视化设置界面（插件已重载）`
        } else {
          return `⚠️ 用户 ${userId} 已在当前群组安全名单中`
        }
      } else if (action === 'remove') {
        if (index !== -1) {
          currentGuildUsers.splice(index, 1)
          
          // 重置用户统计数据
          if (messageStatsManager) {
            await messageStatsManager.resetUserStats(userId, groupId, false)
          }
          
          ctx.scope.update(config, true)
          const totalUsers = Object.values(config.safeList.userIds).reduce((sum, users) => sum + users.length, 0)
          return `✅ 已将用户 ${userId} 从当前群组安全名单移除\n` +
                 `📝 当前群组安全名单: ${currentGuildUsers.join(', ') || '无'}\n` +
                 `📊 全局安全名单用户总数: ${totalUsers} 个\n` +
                 `🔧 安全名单状态: ${config.safeList.enabled ? '启用' : '禁用'}\n` +
                 `🔄 已重置用户统计数据，计数将从0开始\n` +
                 `💡 设置已生效并同步到可视化设置界面（插件已重载）`
        } else {
          return `⚠️ 用户 ${userId} 不在当前群组安全名单中`
        }
      }
    })

  // 性能统计重置子命令
  ctx.command('ad-monitoring.reset-stats', '重置性能统计数据')
    .action(async ({ session }) => {
      // 检查是否在监控的群聊中使用命令
      const groupId = session.guildId || session.channelId
      if (!session.isDirect && groupId && !config.monitoredGroups.includes(groupId)) {
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] ad-monitoring.reset-stats命令在非监控群聊中被调用: 群=${groupId}, 用户=${session.userId}, 监控列表=[${config.monitoredGroups.join(', ')}]`)
        }
        return // 不在监控列表中的群聊不做任何回复，但记录debug日志
      }

      if (!config.admins.includes(session.userId)) {
        return '❌ 权限不足，只有管理员可以使用此命令'
      }

      if (config.performance.enableQueue && messageQueue) {
        const oldStats = messageQueue.getStatus().stats
        messageQueue.resetStats()
        return `✅ 性能统计数据已重置\n` +
               `📊 重置前统计:\n` +
               `• 总处理数: ${oldStats.totalProcessed}\n` +
               `• 成功率: ${oldStats.successRate}\n` +
               `• 平均处理时间: ${Math.round(oldStats.averageProcessingTime)}ms\n` +
               `• 运行时间: ${oldStats.uptimeFormatted}`
      } else {
        return '⚠️ 队列处理未启用，无统计数据可重置'
      }
    })

  // 违规记录重置子命令
  ctx.command('ad-monitoring.reset-offenses', '重置违规记录')
    .action(async ({ session }) => {
      // 检查是否在监控的群聊中使用命令
      const groupId = session.guildId || session.channelId
      if (!session.isDirect && groupId && !config.monitoredGroups.includes(groupId)) {
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] ad-monitoring.reset-offenses命令在非监控群聊中被调用: 群=${groupId}, 用户=${session.userId}, 监控列表=[${config.monitoredGroups.join(', ')}]`)
        }
        return // 不在监控列表中的群聊不做任何回复，但记录debug日志
      }

      if (!config.admins.includes(session.userId)) {
        return '❌ 权限不足，只有管理员可以使用此命令'
      }

      if (config.repeatOffenseRules.enabled) {
        const oldStats = offenseTracker.getStats()
        offenseTracker.reset()
        return `✅ 违规记录已重置\n` +
               `📊 重置前统计:\n` +
               `• 总违规记录: ${oldStats.totalRecords}\n` +
               `• 活跃违规记录: ${oldStats.activeRecords}`
      } else {
        return '⚠️ 反复触发禁言功能未启用，无违规记录可重置'
      }
    })

  // 敏感度调整子命令
  ctx.command('ad-monitoring.sensitivity <level>', '调整广告检测敏感度')
    .example('ad-monitoring sensitivity 8  # 设置敏感度为 8（严格模式）')
    .action(async ({ session }, level) => {
      if (!config.admins.includes(session.userId)) {
        return '❌ 权限不足，只有管理员可以使用此命令'
      }

      // 检查是否在监控的群聊中使用命令
      const groupId = session.guildId || session.channelId
      if (!session.isDirect && groupId && !config.monitoredGroups.includes(groupId)) {
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] ad-monitoring.sensitivity命令在非监控群聊中被调用: 群=${groupId}, 用户=${session.userId}, 监控列表=[${config.monitoredGroups.join(', ')}]`)
        }
        return // 不在监控列表中的群聊不做任何回复，但记录debug日志
      }

      if (!level) {
        const currentDesc = config.sensitivity <= 3 ? '宽松' : config.sensitivity <= 6 ? '中等' : '严格'
        return `📊 当前检测敏感度: ${config.sensitivity}/10 (${currentDesc})\n` +
               `💡 使用方法: ad-monitoring sensitivity <1-10>\n` +
               `📝 敏感度说明:\n` +
               `• 1-3: 宽松模式，只检测明显广告\n` +
               `• 4-6: 中等模式，平衡检测准确性\n` +
               `• 7-10: 严格模式，高度敏感检测`
      }

      const newLevel = parseInt(level)
      if (isNaN(newLevel) || newLevel < 1 || newLevel > 10) {
        return '❌ 敏感度必须是 1-10 之间的数字'
      }

      const oldLevel = config.sensitivity
      const oldDesc = oldLevel <= 3 ? '宽松' : oldLevel <= 6 ? '中等' : '严格'
      const newDesc = newLevel <= 3 ? '宽松' : newLevel <= 6 ? '中等' : '严格'
      
      // 更新配置并触发插件重载以确保生效
      config.sensitivity = newLevel
      ctx.scope.update(config, true)
      
      return `✅ 检测敏感度已调整\n` +
             `📊 ${oldLevel}/10 (${oldDesc}) → ${newLevel}/10 (${newDesc})\n` +
             `💡 新设置已生效并同步到可视化设置界面（插件已重载）`
    })

  // 关键词管理子命令
  ctx.command('ad-monitoring.keywords <action> [keyword]', '关键词管理')
    .example('ad-monitoring keywords list  # 查看本地关键词列表')
    .example('ad-monitoring keywords add 新关键词  # 添加关键词')
    .example('ad-monitoring keywords remove 关键词  # 移除关键词')
    .action(async ({ session }, action, keyword) => {
      if (!config.admins.includes(session.userId)) {
        return '❌ 权限不足，只有管理员可以使用此命令'
      }

      // 检查是否在监控的群聊中使用命令
      const groupId = session.guildId || session.channelId
      if (!session.isDirect && groupId && !config.monitoredGroups.includes(groupId)) {
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] ad-monitoring.keywords命令在非监控群聊中被调用: 群=${groupId}, 用户=${session.userId}, 监控列表=[${config.monitoredGroups.join(', ')}]`)
        }
        return // 不在监控列表中的群聊不做任何回复，但记录debug日志
      }

      if (!action) {
        return '❌ 请指定操作类型\n' +
               '• list - 查看关键词列表\n' +
               '• add <关键词> - 添加关键词\n' +
               '• remove <关键词> - 移除关键词\n' +
               '• status - 查看关键词触发状态'
      }

      switch (action.toLowerCase()) {
        case 'list':
          const localKeywords = config.keywordTrigger.localKeywords || []
          if (localKeywords.length === 0) {
            return '📝 本地关键词列表为空\n💡 使用 ad-monitoring keywords add <关键词> 添加关键词'
          }
          return `📝 本地关键词列表 (${localKeywords.length} 个):\n` +
                 localKeywords.map((kw, index) => `${index + 1}. ${kw}`).join('\n') +
                 '\n\n💡 云规则关键词不在此列表中显示（用户不可修改）'

        case 'add':
          if (!keyword || keyword.trim().length === 0) {
            return '❌ 请指定要添加的关键词\n用法: ad-monitoring keywords add <关键词>'
          }
          
          const trimmedKeyword = keyword.trim()
          if (!config.keywordTrigger.localKeywords) {
            config.keywordTrigger.localKeywords = []
          }
          
          if (config.keywordTrigger.localKeywords.includes(trimmedKeyword)) {
            return `⚠️ 关键词 "${trimmedKeyword}" 已存在于本地列表中`
          }
          
          config.keywordTrigger.localKeywords.push(trimmedKeyword)
          ctx.scope.update(config, true)
          
          return `✅ 已添加关键词 "${trimmedKeyword}"\n` +
                 `📝 当前本地关键词: ${config.keywordTrigger.localKeywords.join(', ')}\n` +
                 `💡 设置已生效并同步到可视化设置界面（插件已重载）`

        case 'remove':
          if (!keyword || keyword.trim().length === 0) {
            return '❌ 请指定要移除的关键词\n用法: ad-monitoring keywords remove <关键词>'
          }
          
          const keywordToRemove = keyword.trim()
          if (!config.keywordTrigger.localKeywords) {
            config.keywordTrigger.localKeywords = []
          }
          
          const index = config.keywordTrigger.localKeywords.indexOf(keywordToRemove)
          if (index === -1) {
            return `⚠️ 关键词 "${keywordToRemove}" 不在本地列表中`
          }
          
          config.keywordTrigger.localKeywords.splice(index, 1)
          ctx.scope.update(config, true)
          
          return `✅ 已移除关键词 "${keywordToRemove}"\n` +
                 `📝 当前本地关键词: ${config.keywordTrigger.localKeywords.join(', ')}\n` +
                 `💡 设置已生效并同步到可视化设置界面（插件已重载）`

        case 'status':
          const stats = cloudRulesManager.getStats()
          const lastUpdateTime = stats.lastUpdateTime > 0 ? 
            new Date(stats.lastUpdateTime).toLocaleString() : '未更新'
          
          let statusMsg = `🔑 关键词触发状态\n` +
                         `功能状态: ${config.keywordTrigger.enabled ? '启用' : '禁用'}\n` +
                         `本地关键词: ${stats.localCount} 个\n`
          
          if (config.keywordTrigger.cloudRulesEnabled) {
            statusMsg += `云规则状态: 启用\n` +
                        `云规则关键词: ${stats.cloudCount} 个\n` +
                        `最后更新时间: ${lastUpdateTime}\n`
          } else {
            statusMsg += `云规则状态: 禁用\n`
          }
          
          statusMsg += `总关键词数: ${stats.totalCount} 个\n` +
                      `触发逻辑: ${config.keywordTrigger.enabled ? '仅在检测到关键词时进行AI检测' : '所有消息都进行AI检测'}`
          
          return statusMsg

        default:
          return '❌ 未知操作类型\n支持的操作: list, add, remove, status'
      }
    })

  // 云规则管理子命令
  ctx.command('ad-monitoring.cloud-rules <action>', '云规则管理')
    .example('ad-monitoring cloud-rules status  # 查看云规则状态')
    .example('ad-monitoring cloud-rules update  # 手动更新云规则')
    .action(async ({ session }, action) => {
      if (!config.admins.includes(session.userId)) {
        return '❌ 权限不足，只有管理员可以使用此命令'
      }

      if (!action) {
        return '❌ 请指定操作类型\n' +
               '• status - 查看云规则状态\n' +
               '• update - 手动更新云规则\n' +
               '• preview - 预览云规则关键词（前20个）'
      }

      switch (action.toLowerCase()) {
        case 'status':
          const stats = cloudRulesManager.getStats()
          const lastUpdateTime = stats.lastUpdateTime > 0 ? 
            new Date(stats.lastUpdateTime).toLocaleString() : '未更新'
          
          let statusMsg = `☁️ 云规则状态\n` +
                         `功能状态: ${config.keywordTrigger.cloudRulesEnabled ? '启用' : '禁用'}\n`
          
          if (config.keywordTrigger.cloudRulesEnabled) {
            statusMsg += `云规则URL: ${config.keywordTrigger.cloudRulesUrl}\n` +
                        `更新间隔: ${config.keywordTrigger.cloudRulesUpdateInterval} 小时\n` +
                        `云规则关键词: ${stats.cloudCount} 个\n` +
                        `最后更新时间: ${lastUpdateTime}\n` +
                        `自动更新: 启用`
          } else {
            statusMsg += `说明: 云规则功能已禁用，仅使用本地关键词`
          }
          
          return statusMsg

        case 'update':
          if (!config.keywordTrigger.cloudRulesEnabled) {
            return '⚠️ 云规则功能未启用，无法更新\n💡 请在配置中启用云规则功能'
          }
          
          const updateResult = await cloudRulesManager.manualUpdate()
          return updateResult.success ? 
            `✅ ${updateResult.message}` : 
            `❌ ${updateResult.message}`

        case 'preview':
          if (!config.keywordTrigger.cloudRulesEnabled) {
            return '⚠️ 云规则功能未启用\n💡 请在配置中启用云规则功能'
          }
          
          const cloudKeywords = cloudRulesManager.getCloudKeywords()
          if (cloudKeywords.length === 0) {
            return '📝 云规则关键词列表为空\n💡 使用 ad-monitoring cloud-rules update 更新云规则'
          }
          
          const previewKeywords = cloudKeywords.slice(0, 20)
          let previewMsg = `📝 云规则关键词预览 (显示前20个，共${cloudKeywords.length}个):\n`
          previewMsg += previewKeywords.map((kw, index) => `${index + 1}. ${kw}`).join('\n')
          
          if (cloudKeywords.length > 20) {
            previewMsg += `\n\n... 还有 ${cloudKeywords.length - 20} 个关键词未显示`
          }
          
          return previewMsg

        default:
           return '❌ 未知操作类型\n支持的操作: status, update, preview'
       }
     })

  // 消息监测统计命令
  ctx.command('ad-monitoring.stats [type] [userId]', '消息监测统计查询')
    .example('ad-monitoring stats overview  # 查看总体统计')
    .example('ad-monitoring stats user 123456789  # 查看指定用户在当前群的统计')
    .example('ad-monitoring stats guild  # 查看当前群的所有用户统计')
    .action(async ({ session }, type, userId) => {
      if (!config.admins.includes(session.userId)) {
        return '❌ 权限不足，只有管理员可以使用此命令'
      }

      const groupId = session.guildId || session.channelId
      if (!groupId) {
        return '❌ 无法获取群聊信息'
      }

      if (!type) {
        return '❌ 请指定查询类型\n' +
               '• overview - 查看总体统计概览\n' +
               '• user <用户ID> - 查看指定用户在当前群的统计\n' +
               '• guild - 查看当前群的所有用户统计\n' +
               '• cleanup <天数> - 清理指定天数前的旧数据（默认90天）'
      }

      try {
        switch (type.toLowerCase()) {
          case 'overview':
            const overview = await messageStatsManager.getStatsOverview()
            return `📊 消息监测统计概览\n` +
                   `总监测用户数: ${overview.totalUsers}\n` +
                   `总监测群聊数: ${overview.totalGuilds}\n` +
                   `广告消息总数: ${overview.totalAdMessages}\n` +
                   `正常消息总数: ${overview.totalNormalMessages}\n` +
                   `总消息数: ${overview.totalAdMessages + overview.totalNormalMessages}\n` +
                   `广告检出率: ${overview.totalAdMessages + overview.totalNormalMessages > 0 ? 
                     ((overview.totalAdMessages / (overview.totalAdMessages + overview.totalNormalMessages)) * 100).toFixed(2) + '%' : '0%'}`

          case 'user':
            if (!userId) {
              return '❌ 请指定用户ID\n用法: ad-monitoring stats user <用户ID>'
            }
            
            const userStats = await messageStatsManager.getUserStats(userId, groupId)
            if (!userStats) {
              return `📊 用户 ${userId} 在当前群暂无监测记录`
            }
            
            const createTime = new Date(userStats.createTime).toLocaleString()
            const lastUpdateTime = new Date(userStats.lastUpdateTime).toLocaleString()
            const totalMessages = userStats.adCount + userStats.normalCount
            const adRate = totalMessages > 0 ? ((userStats.adCount / totalMessages) * 100).toFixed(2) + '%' : '0%'
            
            return `📊 用户 ${userId} 在当前群的监测统计\n` +
                   `广告消息数: ${userStats.adCount}\n` +
                   `正常消息数: ${userStats.normalCount}\n` +
                   `总消息数: ${totalMessages}\n` +
                   `广告比例: ${adRate}\n` +
                   `首次记录时间: ${createTime}\n` +
                   `最后更新时间: ${lastUpdateTime}`

          case 'guild':
            const guildStats = await messageStatsManager.getGuildStats(groupId)
            if (guildStats.length === 0) {
              return `📊 当前群聊暂无监测记录`
            }
            
            let guildMessage = `📊 当前群聊监测统计 (共${guildStats.length}个用户)\n\n`
            
            // 按总消息数排序
            guildStats.sort((a, b) => (b.adCount + b.normalCount) - (a.adCount + a.normalCount))
            
            // 只显示前10个用户，避免消息过长
            const topUsers = guildStats.slice(0, 10)
            
            for (const stats of topUsers) {
              const totalMessages = stats.adCount + stats.normalCount
              const adRate = totalMessages > 0 ? ((stats.adCount / totalMessages) * 100).toFixed(1) + '%' : '0%'
              guildMessage += `用户 ${stats.userId}:\n` +
                             `  广告: ${stats.adCount} | 正常: ${stats.normalCount} | 比例: ${adRate}\n`
            }
            
            if (guildStats.length > 10) {
              guildMessage += `\n... 还有 ${guildStats.length - 10} 个用户未显示`
            }
            
            return guildMessage

          case 'cleanup':
            const daysToKeep = userId ? parseInt(userId) : 90
            if (isNaN(daysToKeep) || daysToKeep < 1) {
              return '❌ 请指定有效的天数（大于0的整数）\n用法: ad-monitoring stats cleanup <天数>'
            }
            
            await messageStatsManager.cleanupOldData(daysToKeep)
            return `✅ 已清理 ${daysToKeep} 天前的旧统计数据`

          default:
            return '❌ 未知查询类型\n支持的类型: overview, user, guild, cleanup'
        }
      } catch (error) {
        ctx.logger.error('消息统计查询失败:', error)
        return `❌ 查询失败: ${error.message}`
      }
    })

  // 插件销毁时的清理工作
  ctx.on('dispose', () => {
    if (cloudRulesManager) {
      cloudRulesManager.destroy()
    }
  })
}

/**
 * 构建OpenAI兼容的API端点URL
 */
function buildApiEndpoint(baseEndpoint: string): string {
  if (baseEndpoint.endsWith('/chat/completions')) {
    return baseEndpoint
  }
  // 移除末尾的斜杠（如果有）并添加正确的路径
  return baseEndpoint.replace(/\/$/, '') + '/chat/completions'
}

/**
 * 判断错误是否可以重试
 */
function isErrorRetryable(error: any, statusCode?: number): boolean {
  // 网络错误和超时错误通常可以重试
  if (error.name === 'AbortError' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return true
  }
  
  // 基于HTTP状态码判断
  if (statusCode) {
    // 5xx 服务器错误通常可以重试
    if (statusCode >= 500 && statusCode < 600) {
      return true
    }
    // 429 请求过多，可以重试
    if (statusCode === 429) {
      return true
    }
    // 408 请求超时，可以重试
    if (statusCode === 408) {
      return true
    }
    // 4xx 客户端错误通常不应重试（除了上述特殊情况）
    if (statusCode >= 400 && statusCode < 500) {
      return false
    }
  }
  
  // 默认对未知错误进行重试
  return true
}

/**
 * 计算重试延迟时间（指数退避算法）
 */
function calculateRetryDelay(attempt: number, baseDelay: number, statusCode?: number, errorName?: string): number {
  // 基础延迟时间
  let delay = baseDelay
  
  // 针对不同错误类型调整延迟策略
  if (statusCode === 503) {
    // 503 Service Unavailable - 使用更长的延迟
    delay = Math.min(baseDelay * Math.pow(2, attempt), 30000) // 最大30秒
  } else if (statusCode === 429) {
    // 429 Too Many Requests - 使用指数退避
    delay = Math.min(baseDelay * Math.pow(2, attempt), 60000) // 最大60秒
  } else if (errorName === 'AbortError') {
    // 超时错误 - 使用较短的延迟
    delay = Math.min(baseDelay, 2000) // 最大2秒
  } else if (statusCode && statusCode >= 500) {
    // 其他5xx错误 - 使用指数退避但限制最大值
    delay = Math.min(baseDelay * Math.pow(1.5, attempt), 15000) // 最大15秒
  }
  
  // 添加随机抖动，避免雷群效应
  const jitter = Math.random() * 0.3 * delay // 30%的随机抖动
  return Math.floor(delay + jitter)
}

/**
 * 获取错误类型描述
 */
function getErrorType(error: any, statusCode?: number): string {
  if (error.name === 'AbortError') {
    return '请求超时'
  }
  if (statusCode === 503) {
    return '服务不可用'
  }
  if (statusCode === 429) {
    return '请求过多'
  }
  if (statusCode === 408) {
    return '请求超时'
  }
  if (statusCode && statusCode >= 500) {
    return '服务器错误'
  }
  if (statusCode && statusCode >= 400) {
    return '客户端错误'
  }
  return '网络错误'
}

/**
 * API密钥轮询管理器
 */
class ApiKeyManager {
  /**
   * 获取下一个可用的API密钥
   * @param apiKeys API密钥数组
   * @param currentIndex 当前索引
   * @returns 下一个API密钥和新的索引
   */
  static getNextApiKey(apiKeys: string[], currentIndex: number = 0): { apiKey: string; nextIndex: number } {
    if (!apiKeys || apiKeys.length === 0) {
      throw new Error('API密钥列表为空')
    }
    
    // 过滤掉空字符串
    const validKeys = apiKeys.filter(key => key && key.trim() !== '')
    if (validKeys.length === 0) {
      throw new Error('没有有效的API密钥')
    }
    
    // 确保索引在有效范围内
    const safeIndex = currentIndex % validKeys.length
    const nextIndex = (safeIndex + 1) % validKeys.length
    
    return {
      apiKey: validKeys[safeIndex],
      nextIndex: nextIndex
    }
  }
  
  /**
   * 初始化API密钥索引
   * @param config 配置对象
   */
  static initializeKeyIndexes(config: Config): void {
    if (config.aiModel.currentKeyIndex === undefined) {
      config.aiModel.currentKeyIndex = 0
    }
    if (config.visionModel.currentKeyIndex === undefined) {
      config.visionModel.currentKeyIndex = 0
    }
  }
}

/**
 * 检测图片中的二维码
 */
async function detectQRCode(imageUrl: string, config: Config, ctx: Context): Promise<{ hasQRCode: boolean; qrContent?: string }> {
  let retryCount = 0
  const maxRetries = config.visionModel.retryCount
  let baseDelay = config.visionModel.retryDelay
  let lastError: any
  
  while (retryCount <= maxRetries) {
    try {
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 二维码检测尝试 ${retryCount + 1}/${maxRetries + 1}: ${imageUrl}`)
      }
      
      // 构建二维码检测提示词
      const qrPrompt = '请仔细检查这张图片中是否包含二维码（QR Code）。如果发现二维码，请回答"是"并尽可能描述二维码的内容或位置。如果没有发现二维码，请明确回答"否"。'
      
      const requestBody = {
        model: config.visionModel.modelName,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: qrPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      }
      
      // 构建完整的API端点URL
      const fullEndpoint = buildApiEndpoint(config.visionModel.endpoint)
      
      // 获取当前API密钥
      const { apiKey, nextIndex } = ApiKeyManager.getNextApiKey(
        config.visionModel.apiKeys, 
        config.visionModel.currentKeyIndex || 0
      )
      
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 二维码检测使用API密钥索引: ${config.visionModel.currentKeyIndex || 0}`)
      }
      
      const response = await ctx.http.post(fullEndpoint, requestBody, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: config.visionModel.timeout
      })
      
      // 请求成功，更新密钥索引
      config.visionModel.currentKeyIndex = nextIndex
      
      if (response?.choices?.[0]?.message?.content) {
        const result = response.choices[0].message.content.trim().toLowerCase()
        const hasQRCode = result.includes('是') || result.includes('yes') || result.includes('二维码') || result.includes('qr') || result.includes('扫码')
        
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] 二维码检测结果: "${response.choices[0].message.content.trim()}"`)
          ctx.logger.info(`[DEBUG] 是否包含二维码: ${hasQRCode}`)
        }
        
        return {
          hasQRCode,
          qrContent: hasQRCode ? response.choices[0].message.content.trim() : undefined
        }
      } else {
        throw new Error('二维码检测API返回数据格式异常')
      }
    } catch (error) {
      lastError = error
      const statusCode = error.response?.status
      const isRetryableError = isErrorRetryable(error, statusCode)
      
      if (config.debugMode) {
        ctx.logger.error(`[DEBUG] 二维码检测第 ${retryCount + 1} 次请求失败: ${error.message}`)
        if (error.response) {
          ctx.logger.error(`[DEBUG] HTTP 状态码: ${statusCode}`)
        }
        ctx.logger.error(`[DEBUG] 错误是否可重试: ${isRetryableError}`)
      }
      
      // 如果错误不可重试，直接退出
      if (!isRetryableError) {
        if (config.debugMode) {
          ctx.logger.warn(`[DEBUG] 二维码检测遇到不可重试错误，停止重试: ${error.message}`)
        }
        break
      }
      
      // 切换到下一个API密钥（如果有多个密钥）
      if (config.visionModel.apiKeys.filter(key => key && key.trim() !== '').length > 1) {
        const { nextIndex } = ApiKeyManager.getNextApiKey(
          config.visionModel.apiKeys, 
          config.visionModel.currentKeyIndex || 0
        )
        config.visionModel.currentKeyIndex = nextIndex
        
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] 二维码检测切换到API密钥索引: ${config.visionModel.currentKeyIndex}`)
        }
      }
      
      retryCount++
      if (retryCount <= maxRetries) {
        const retryDelay = calculateRetryDelay(retryCount - 1, baseDelay, statusCode, error.name)
        
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] 二维码检测 ${retryDelay}ms 后进行第 ${retryCount + 1} 次重试 (错误类型: ${getErrorType(error, statusCode)})`)
        }
        
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }
  
  // 所有重试都失败了
  ctx.logger.warn(`⚠️ 二维码检测最终失败: ${lastError?.message || '未知错误'}`)
  if (config.debugMode) {
    ctx.logger.warn(`[DEBUG] 二维码检测错误详情:`, lastError)
  }
  return { hasQRCode: false }
}

/**
 * 处理检测到的二维码
 */
async function handleQRCodeDetection(session: Session, config: Config, offenseTracker: OffenseTracker, qrContent?: string): Promise<void> {
  try {
    const action = config.visionModel.qrCodeDetection.action
    const groupId = session.guildId
    
    // 添加到违规计次
    let offenseCount = 0
    let isRepeatOffense = false
    if (config.repeatOffenseRules.enabled && groupId) {
      offenseCount = offenseTracker.addOffense(session.userId, groupId, `二维码检测: ${qrContent || '无法解析内容'}`)
      if (offenseCount >= config.repeatOffenseRules.triggerThreshold) {
        isRepeatOffense = true
        if (config.debugMode) {
          session.app.logger.info(`[DEBUG] 🚨 二维码检测触发反复违规禁言: 用户=${session.userId}, 群=${groupId}, 违规次数=${offenseCount}/${config.repeatOffenseRules.triggerThreshold}`)
        }
      }
    }
    
    if (config.debugMode) {
      session.app.logger.info(`[DEBUG] 🎯 处理检测到的二维码`)
      session.app.logger.info(`[DEBUG] 用户: ${session.userId}, 群组: ${session.guildId}`)
      if (qrContent) {
        session.app.logger.info(`[DEBUG] 二维码内容: ${qrContent}`)
      }
    }
    
    // 处理反复违规
    if (isRepeatOffense) {
      // 发送反复违规警告
      if (config.repeatOffenseRules.warningMessage) {
        try {
          const warningMsg = config.repeatOffenseRules.warningMessage
            .replace('{user}', `<@${session.userId}>`)
            .replace('{userId}', session.userId)
            .replace('{count}', offenseCount.toString())
            .replace('{threshold}', config.repeatOffenseRules.triggerThreshold.toString())
            .replace('{timeWindow}', config.repeatOffenseRules.timeWindow.toString())
          
          await sendNotificationWithAutoRecall(session, `<quote id="${session.messageId}"/>${warningMsg}`, config)
          if (config.debugMode) {
            session.app.logger.info(`[DEBUG] ✅ 已发送二维码反复违规警告消息`)
          }
        } catch (error) {
          if (config.debugMode) {
            session.app.logger.error('[DEBUG] ❌ 发送二维码反复违规警告失败:', error)
          }
        }
      }
      
      // 反复违规禁言
      try {
        await session.bot.muteGuildMember(session.guildId, session.userId, config.repeatOffenseRules.muteDuration * 60 * 1000)
        if (config.debugMode) {
          session.app.logger.info(`[DEBUG] ✅ 已执行二维码反复违规禁言: ${config.repeatOffenseRules.muteDuration} 分钟`)
        }
      } catch (error) {
        if (config.debugMode) {
          session.app.logger.error('[DEBUG] ❌ 二维码反复违规禁言失败:', error)
        }
      }
      
      // 踢出用户
      if (config.repeatOffenseRules.kickUser) {
        try {
          await session.bot.kickGuildMember(session.guildId, session.userId)
          if (config.debugMode) {
            session.app.logger.info(`[DEBUG] ✅ 已踢出反复违规用户（二维码）`)
          }
        } catch (error) {
          if (config.debugMode) {
            session.app.logger.error('[DEBUG] ❌ 踢出反复违规用户失败（二维码）:', error)
          }
        }
      }
    }
    
    // 撤回消息（无论是否反复违规都执行）
    if (action.directRecall) {
      try {
        await session.bot.deleteMessage(session.channelId, session.messageId)
        if (config.debugMode) {
          session.app.logger.info(`[DEBUG] ✅ 已撤回包含二维码的图片消息`)
        }
      } catch (recallError) {
        if (config.debugMode) {
          session.app.logger.error('[DEBUG] ❌ 撤回二维码消息失败:', recallError)
        }
      }
    }
    
    if (!isRepeatOffense) {
      // 常规处理（仅在非反复违规时执行警告和禁言）
      // 发送警告消息
      if (action.sendWarning && action.warningMessage) {
        try {
          await sendNotificationWithAutoRecall(session, `<quote id="${session.messageId}"/>${action.warningMessage}`, config)
          if (config.debugMode) {
            session.app.logger.info(`[DEBUG] ✅ 已发送二维码警告消息`)
          }
        } catch (warningError) {
          if (config.debugMode) {
            session.app.logger.error('[DEBUG] ❌ 发送二维码警告消息失败:', warningError)
          }
        }
      }

      // 禁言用户
      if (action.muteUser && action.muteDuration > 0) {
        try {
          await session.bot.muteGuildMember(session.guildId, session.userId, action.muteDuration * 60 * 1000)
          if (config.debugMode) {
            session.app.logger.info(`[DEBUG] ✅ 已禁言用户 ${session.userId} ${action.muteDuration} 分钟（二维码）`)
          }
        } catch (muteError) {
          if (config.debugMode) {
            session.app.logger.error('[DEBUG] ❌ 禁言用户失败（二维码）:', muteError)
          }
        }
      }
    }
    
  } catch (error) {
    if (config.debugMode) {
      session.app.logger.error('[DEBUG] 处理二维码检测时发生错误:', error)
    }
  }
}

/**
 * 执行视觉模型图片识别
 */
async function performVisionRecognition(imageUrl: string, config: Config, ctx: Context, session?: Session): Promise<{ recognizedText: string | null; hasQRCode: boolean; qrContent?: string }> {
  // 首先检测二维码（如果启用）
  let qrResult: { hasQRCode: boolean; qrContent?: string } = { hasQRCode: false }
  if (config.visionModel.qrCodeDetection.enabled) {
    qrResult = await detectQRCode(imageUrl, config, ctx)
    
    // 如果检测到二维码且配置为直接处理，则不进行文字识别
    if (qrResult.hasQRCode && config.visionModel.qrCodeDetection.action.directRecall) {
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 🔍 检测到二维码，跳过文字识别`)
      }
      return {
        recognizedText: null,
        hasQRCode: qrResult.hasQRCode,
        qrContent: qrResult.qrContent
      }
    }
  }
  
  // 进行文字识别
  let retryCount = 0
  const maxRetries = config.visionModel.retryCount
  let baseDelay = config.visionModel.retryDelay
  let lastError: any
  
  while (retryCount <= maxRetries) {
    try {
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 视觉识别尝试 ${retryCount + 1}/${maxRetries + 1}: ${imageUrl}`)
      }
      
      // 构建视觉识别提示词
      const visionPrompt = '请识别图片中的所有文字内容，包括但不限于：文本、标题、按钮文字、链接文字等。请尽可能完整地提取所有可见的文字信息。'
      
      const requestBody = {
        model: config.visionModel.modelName,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: visionPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      }
      
      // 构建完整的API端点URL
      const fullEndpoint = buildApiEndpoint(config.visionModel.endpoint)
      
      // 获取当前API密钥
      const { apiKey, nextIndex } = ApiKeyManager.getNextApiKey(
        config.visionModel.apiKeys, 
        config.visionModel.currentKeyIndex || 0
      )
      
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 视觉识别使用API密钥索引: ${config.visionModel.currentKeyIndex || 0}`)
      }
      
      const response = await ctx.http.post(fullEndpoint, requestBody, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: config.visionModel.timeout
      })
      
      // 请求成功，更新密钥索引
      config.visionModel.currentKeyIndex = nextIndex
      
      if (response?.choices?.[0]?.message?.content) {
        const recognizedText = response.choices[0].message.content.trim()
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] 视觉识别成功: "${recognizedText.substring(0, 100)}${recognizedText.length > 100 ? '...' : ''}"`) 
        }
        return {
          recognizedText,
          hasQRCode: qrResult.hasQRCode,
          qrContent: qrResult.qrContent
        }
      } else {
        throw new Error('视觉模型API返回数据格式异常')
      }
    } catch (error) {
      lastError = error
      const statusCode = error.response?.status
      const isRetryableError = isErrorRetryable(error, statusCode)
      
      if (config.debugMode) {
        ctx.logger.error(`[DEBUG] 视觉识别第 ${retryCount + 1} 次请求失败: ${error.message}`)
        if (error.response) {
          ctx.logger.error(`[DEBUG] HTTP 状态码: ${statusCode}`)
        }
        ctx.logger.error(`[DEBUG] 错误是否可重试: ${isRetryableError}`)
      }
      
      // 如果错误不可重试，直接退出
      if (!isRetryableError) {
        if (config.debugMode) {
          ctx.logger.warn(`[DEBUG] 视觉识别遇到不可重试错误，停止重试: ${error.message}`)
        }
        break
      }
      
      // 切换到下一个API密钥（如果有多个密钥）
      if (config.visionModel.apiKeys.filter(key => key && key.trim() !== '').length > 1) {
        const { nextIndex } = ApiKeyManager.getNextApiKey(
          config.visionModel.apiKeys, 
          config.visionModel.currentKeyIndex || 0
        )
        config.visionModel.currentKeyIndex = nextIndex
        
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] 视觉识别切换到API密钥索引: ${config.visionModel.currentKeyIndex}`)
        }
      }
      
      retryCount++
      if (retryCount <= maxRetries) {
        const retryDelay = calculateRetryDelay(retryCount - 1, baseDelay, statusCode, error.name)
        
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] 视觉识别 ${retryDelay}ms 后进行第 ${retryCount + 1} 次重试 (错误类型: ${getErrorType(error, statusCode)})`)
        }
        
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }
  
  // 所有重试都失败了
  ctx.logger.warn(`⚠️ 视觉识别最终失败: ${lastError?.message || '未知错误'}`)
  if (config.debugMode) {
    ctx.logger.warn(`[DEBUG] 视觉识别错误详情:`, lastError)
  }
  return {
    recognizedText: null,
    hasQRCode: qrResult.hasQRCode,
    qrContent: qrResult.qrContent
  }
}



/**
 * 检测消息是否为合并转发消息（支持多种格式）
 * 包含严格的验证逻辑，防止误判普通文本
 */
function isForwardMessage(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false
  }
  
  // 检测 XML 格式: <forward id="xxx"/> 
  // 要求 id 必须是数字或合法的转发ID格式
  const xmlForwardRegex = /<forward\s+id="([^"]+)"\s*\/?>/i
  const xmlMatch = content.match(xmlForwardRegex)
  if (xmlMatch && xmlMatch[1]) {
    const forwardId = xmlMatch[1]
    // 验证转发ID格式：应该是纯数字或包含特定字符的合法ID
    if (/^\d+$/.test(forwardId) || /^[a-zA-Z0-9_-]+$/.test(forwardId)) {
      return true
    }
  }
  
  // 检测 CQ 码格式: [CQ:forward,id=xxx,content=...]
  // 要求严格的CQ码格式，防止误判普通文本中的方括号内容
  const cqForwardRegex = /^\[CQ:forward,id=([^,\]]+)(?:,content=[^\]]*)?\]$/i
  const cqMatch = content.match(cqForwardRegex)
  if (cqMatch && cqMatch[1]) {
    const forwardId = cqMatch[1]
    // 验证转发ID格式
    if (/^\d+$/.test(forwardId) || /^[a-zA-Z0-9_-]+$/.test(forwardId)) {
      return true
    }
  }
  
  // 如果不是完整的CQ码，检查是否包含在消息中（用于内嵌检测）
  if (!cqMatch) {
    const embeddedCqRegex = /\[CQ:forward,id=([^,\]]+)(?:,content=[^\]]*)?\]/i
    const embeddedMatch = content.match(embeddedCqRegex)
    if (embeddedMatch && embeddedMatch[1]) {
      const forwardId = embeddedMatch[1]
      if (/^\d+$/.test(forwardId) || /^[a-zA-Z0-9_-]+$/.test(forwardId)) {
        return true
      }
    }
  }
  
  return false
}

/**
 * 从消息中提取转发消息ID（支持多种格式）
 * 包含严格的验证逻辑，确保只提取有效的转发ID
 */
function extractForwardIds(content: string): string[] {
  const ids: string[] = []
  
  // 提取 XML 格式的 ID
  const xmlMatches = content.matchAll(/<forward\s+id="([^"]+)"\s*\/?>/gi)
  for (const match of xmlMatches) {
    if (match[1]) {
      const forwardId = match[1]
      // 验证转发ID格式：应该是纯数字或包含特定字符的合法ID
      if (/^\d+$/.test(forwardId) || /^[a-zA-Z0-9_-]+$/.test(forwardId)) {
        ids.push(forwardId)
      }
    }
  }
  
  // 提取 CQ 码格式的 ID
  const cqMatches = content.matchAll(/\[CQ:forward,id=([^,\]]+)(?:,content=[^\]]*)?\]/gi)
  for (const match of cqMatches) {
    if (match[1]) {
      const forwardId = match[1]
      // 验证转发ID格式
      if (/^\d+$/.test(forwardId) || /^[a-zA-Z0-9_-]+$/.test(forwardId)) {
        ids.push(forwardId)
      }
    }
  }
  
  return ids
}

/**
 * 移除消息中的转发标签（支持多种格式）
 */
function removeForwardTags(content: string): string {
  let result = content
  // 移除 XML 格式的转发标签
  result = result.replace(/<forward\s+id="[^"]+"\s*\/?>/g, '')
  // 移除 CQ 码格式的转发标签
  result = result.replace(/\[CQ:forward,id=[^,\]]+(?:,content=[^\]]*)?\]/g, '')
  return result.trim()
}

/**
 * 递归提取转发消息中的所有文本内容（支持内嵌检测）
 */
async function extractForwardMessages(session: Session, config: Config): Promise<{ messages: string[], depthExceeded: boolean }> {
  return await extractForwardMessagesRecursive(session, config, session.content || '', 0)
}

/**
 * 解析 CQ 码格式的图片并转换为 img 标签
 */
function parseCQCodeImages(content: string, config: Config, session: Session): string {
  if (!content) return content
  
  // 匹配 CQ 码格式的图片：[CQ:image,file=xxx,url=xxx]
  const cqImageRegex = /\[CQ:image,([^\]]+)\]/gi
  
  return content.replace(cqImageRegex, (match, params) => {
    try {
      // 改进的参数解析逻辑，支持包含特殊字符的URL
      let url = ''
      let file = ''
      
      // 直接使用字符串查找方法，更可靠地提取URL参数
      const urlIndex = params.indexOf('url=')
      if (urlIndex !== -1) {
        const urlStart = urlIndex + 4 // 'url='.length
        let urlEnd = params.length
        
        // 查找下一个参数的开始位置（,key=格式）
        const nextParamMatch = params.substring(urlStart).match(/,\w+=/)
        if (nextParamMatch) {
          urlEnd = urlStart + nextParamMatch.index
        }
        
        url = params.substring(urlStart, urlEnd)
      }
      
      // 同样的方法提取file参数
      const fileIndex = params.indexOf('file=')
      if (fileIndex !== -1) {
        const fileStart = fileIndex + 5 // 'file='.length
        let fileEnd = params.length
        
        // 查找下一个参数的开始位置
        const nextParamMatch = params.substring(fileStart).match(/,\w+=/)
        if (nextParamMatch) {
          fileEnd = fileStart + nextParamMatch.index
        }
        
        file = params.substring(fileStart, fileEnd)
      }
      
      // 优先使用 url，如果没有则使用 file
      let imageUrl = url || file
      
      if (imageUrl) {
        // 修复图片URL格式：将分号替换为&符号（与普通消息处理保持一致）
        const originalUrl = imageUrl
        imageUrl = imageUrl.replace(/;/g, '&')
        
        // 处理HTML实体编码
        imageUrl = imageUrl.replace(/&amp;/g, '&')
        
        const imgTag = `<img src="${imageUrl}" alt="转发图片" />`
        
        if (config.debugMode) {
          session.app.logger.info(`[DEBUG] 解析CQ码图片: ${match} -> ${imgTag}`)
          if (originalUrl !== imageUrl) {
            session.app.logger.info(`[DEBUG] CQ码URL修复: ${originalUrl} -> ${imageUrl}`)
          }
        }
        
        return imgTag
      } else {
        if (config.debugMode) {
          session.app.logger.warn(`[DEBUG] CQ码图片缺少URL信息: ${match}`)
        }
        return match // 保持原样
      }
    } catch (error) {
      if (config.debugMode) {
        session.app.logger.error(`[DEBUG] 解析CQ码图片失败: ${match}`, error)
      }
      return match // 保持原样
    }
  })
}

/**
 * 解析消息segment数组，提取文本和转发内容
 */
function parseMessageSegments(segments: any[], config: Config, session: Session): { textParts: string[], forwardParts: string[], imageParts: string[] } {
  const textParts = []
  const forwardParts = []
  const imageParts = []
  
  for (const segment of segments) {
    if (config.debugMode) {
      session.app.logger.info(`[DEBUG] 处理segment类型: ${segment.type}, 数据:`, JSON.stringify(segment.data, null, 2))
    }
    
    // 处理文本内容
    if (segment.type === 'text' && segment.data?.text) {
      textParts.push(segment.data.text)
    }
    // 处理图片内容 - image类型
    else if (segment.type === 'image' && segment.data) {
      // 将图片segment转换为img标签格式，以便后续的图片检测逻辑能够正确识别
      let imageUrl = segment.data.url || segment.data.file || segment.data.src
      if (imageUrl) {
        // 修复图片URL格式：将分号替换为&符号（与普通消息处理保持一致）
        const originalUrl = imageUrl
        imageUrl = imageUrl.replace(/;/g, '&')
        
        // 处理HTML实体编码
        imageUrl = imageUrl.replace(/&amp;/g, '&')
        
        const imgTag = `<img src="${imageUrl}"/>`
        imageParts.push(imgTag)
        if (config.debugMode) {
          session.app.logger.info(`[DEBUG] 在message数组中发现image segment，URL: ${imageUrl}`)
          if (originalUrl !== imageUrl) {
            session.app.logger.info(`[DEBUG] image segment URL修复: ${originalUrl} -> ${imageUrl}`)
          }
          session.app.logger.info(`[DEBUG] 生成的img标签: ${imgTag}`)
        }
      } else {
        if (config.debugMode) {
          session.app.logger.warn(`[DEBUG] image segment缺少URL信息:`, JSON.stringify(segment.data, null, 2))
        }
      }
    }
    // 处理其他可能的图片类型 - pic、photo等
    else if (['pic', 'photo', 'img'].includes(segment.type) && segment.data) {
      let imageUrl = segment.data.url || segment.data.file || segment.data.src || segment.data.path
      if (imageUrl) {
        // 修复图片URL格式：将分号替换为&符号（与普通消息处理保持一致）
        const originalUrl = imageUrl
        imageUrl = imageUrl.replace(/;/g, '&')
        
        // 处理HTML实体编码
        imageUrl = imageUrl.replace(/&amp;/g, '&')
        
        const imgTag = `<img src="${imageUrl}"/>`
        imageParts.push(imgTag)
        if (config.debugMode) {
          session.app.logger.info(`[DEBUG] 在message数组中发现${segment.type} segment，URL: ${imageUrl}`)
          if (originalUrl !== imageUrl) {
            session.app.logger.info(`[DEBUG] ${segment.type} segment URL修复: ${originalUrl} -> ${imageUrl}`)
          }
          session.app.logger.info(`[DEBUG] 生成的img标签: ${imgTag}`)
        }
      } else {
        if (config.debugMode) {
          session.app.logger.warn(`[DEBUG] ${segment.type} segment缺少URL信息:`, JSON.stringify(segment.data, null, 2))
        }
      }
    }
    // 处理内嵌的转发消息 - forward类型
    else if (segment.type === 'forward' && segment.data?.id) {
      const forwardTag = `<forward id="${segment.data.id}"/>`
      forwardParts.push(forwardTag)
      if (config.debugMode) {
        session.app.logger.info(`[DEBUG] 在message数组中发现forward segment，ID: ${segment.data.id}`)
      }
    }
    // 处理转发节点 - node类型
    else if (segment.type === 'node' && segment.data) {
      if (segment.data.id) {
        const forwardTag = `<forward id="${segment.data.id}"/>`
        forwardParts.push(forwardTag)
        if (config.debugMode) {
          session.app.logger.info(`[DEBUG] 在message数组中发现node segment，ID: ${segment.data.id}`)
        }
      }
      // node类型还可能包含嵌套的message数组
      if (Array.isArray(segment.data.message)) {
        const nestedResult = parseMessageSegments(segment.data.message, config, session)
        textParts.push(...nestedResult.textParts)
        forwardParts.push(...nestedResult.forwardParts)
        imageParts.push(...nestedResult.imageParts)
        if (config.debugMode) {
          session.app.logger.info(`[DEBUG] 在node segment中发现嵌套消息，文本: ${nestedResult.textParts.length}, 转发: ${nestedResult.forwardParts.length}, 图片: ${nestedResult.imageParts.length}`)
        }
      }
    }
    // 处理富文本内容 - rich类型可能包含转发
    else if (segment.type === 'rich' && segment.data) {
      if (segment.data.content && typeof segment.data.content === 'string') {
        if (isForwardMessage(segment.data.content)) {
          textParts.push(segment.data.content)
          if (config.debugMode) {
            session.app.logger.info(`[DEBUG] 在rich segment中发现转发消息: ${segment.data.content}`)
          }
        } else {
          textParts.push(segment.data.content)
        }
      }
    }
    // 处理其他可能包含转发信息的segment类型
    else if (segment.data && typeof segment.data === 'object') {
      // 检查是否包含图片信息（通用检测）
      let possibleImageUrl = segment.data.url || segment.data.file || segment.data.src || segment.data.path || segment.data.image
      if (possibleImageUrl && typeof possibleImageUrl === 'string') {
        // 检查URL是否看起来像图片
        if (/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(possibleImageUrl) || possibleImageUrl.includes('image') || possibleImageUrl.includes('pic')) {
          // 修复图片URL格式：将分号替换为&符号（与普通消息处理保持一致）
          const originalUrl = possibleImageUrl
          possibleImageUrl = possibleImageUrl.replace(/;/g, '&')
          
          // 处理HTML实体编码
          possibleImageUrl = possibleImageUrl.replace(/&amp;/g, '&')
          
          const imgTag = `<img src="${possibleImageUrl}"/>`
          imageParts.push(imgTag)
          if (config.debugMode) {
            session.app.logger.info(`[DEBUG] 在${segment.type} segment中发现可能的图片URL: ${possibleImageUrl}`)
            if (originalUrl !== possibleImageUrl) {
              session.app.logger.info(`[DEBUG] 通用图片URL修复: ${originalUrl} -> ${possibleImageUrl}`)
            }
            session.app.logger.info(`[DEBUG] 生成的img标签: ${imgTag}`)
          }
        }
      }
      
      // 检查segment.data中是否有id字段，可能是转发相关
      if (segment.data.id && typeof segment.data.id === 'string') {
        // 检查是否是转发相关的segment类型
        if (['forward', 'node', 'share', 'json', 'xml'].includes(segment.type)) {
          const forwardTag = `<forward id="${segment.data.id}"/>`
          forwardParts.push(forwardTag)
          if (config.debugMode) {
            session.app.logger.info(`[DEBUG] 在${segment.type} segment中发现可能的转发ID: ${segment.data.id}`)
          }
        }
      }
      
      // 检查是否有其他可能包含转发内容的字段
      if (segment.data.content && typeof segment.data.content === 'string') {
        if (isForwardMessage(segment.data.content)) {
          textParts.push(segment.data.content)
          if (config.debugMode) {
            session.app.logger.info(`[DEBUG] 在${segment.type} segment的content中发现转发消息`)
          }
        } else {
          textParts.push(segment.data.content)
        }
      }
      
      // 检查data字段本身是否包含转发信息（某些特殊格式）
      if (segment.data.data && typeof segment.data.data === 'string') {
        if (isForwardMessage(segment.data.data)) {
          textParts.push(segment.data.data)
          if (config.debugMode) {
            session.app.logger.info(`[DEBUG] 在${segment.type} segment的data.data中发现转发消息`)
          }
        }
      }
    }
    // 未识别的segment类型，记录调试信息
    else {
      if (config.debugMode) {
        session.app.logger.info(`[DEBUG] 未处理的segment类型: ${segment.type}, 数据:`, JSON.stringify(segment.data, null, 2))
      }
    }
  }
  
  return { textParts, forwardParts, imageParts }
}

/**
 * 检测消息内容是否包含嵌套转发
 * 注意：此函数专门用于检测已解析出的转发消息内容中是否还包含转发标记
 */
function detectNestedForward(content: string, config: Config, session?: Session, isFromForwardMessage: boolean = false): boolean {
  if (!config.nestedForwardDetection.enabled) {
    return false
  }
  
  try {
    // 只有当内容来自转发消息解析时，才检测是否包含嵌套转发
    // 避免对原始转发消息本身进行误判
    if (!isFromForwardMessage) {
      return false
    }
    
    // 检测是否包含转发消息标记
    const hasForward = isForwardMessage(content)
    
    if (config.debugMode && session) {
      const preview = content.length > 100 ? content.substring(0, 100) + '...' : content
      session.app.logger.info(`[DEBUG] 🔍 嵌套转发检测`)
      session.app.logger.info(`[DEBUG] 检测内容: "${preview}"`)
      session.app.logger.info(`[DEBUG] 来源: ${isFromForwardMessage ? '转发消息内容' : '原始消息'}`)
      session.app.logger.info(`[DEBUG] 检测结果: ${hasForward ? '✅ 发现嵌套转发' : '❌ 未发现嵌套转发'}`)
    }
    
    return hasForward
  } catch (error) {
    if (config.debugMode && session) {
      session.app.logger.error('[DEBUG] 嵌套转发检测失败:', error.message)
    }
    return false
  }
}

/**
 * 处理检测到的嵌套转发消息
 */
async function handleNestedForward(session: Session, config: Config): Promise<void> {
  try {
    const userId = session.userId
    const shouldRecall = shouldRecallForUser(userId, config)
    
    if (config.debugMode) {
      session.app.logger.info(`[DEBUG] 🎯 处理嵌套转发消息`)
      session.app.logger.info(`[DEBUG] 用户ID: ${userId}`)
      session.app.logger.info(`[DEBUG] 撤回规则: ${config.nestedForwardDetection.action.recallType}`)
      session.app.logger.info(`[DEBUG] 是否撤回: ${shouldRecall}`)
    }
    
    // 发送通知消息
    if (config.nestedForwardDetection.action.sendNotification) {
      try {
        await sendNotificationWithAutoRecall(session, config.nestedForwardDetection.action.notificationMessage, config)
        if (config.debugMode) {
          session.app.logger.info(`[DEBUG] ✅ 已发送嵌套转发通知消息`)
        }
      } catch (error) {
        if (config.debugMode) {
          session.app.logger.error(`[DEBUG] ❌ 发送通知消息失败:`, error)
        }
      }
    }
    
    // 撤回消息
    if (shouldRecall) {
      try {
        await session.bot.deleteMessage(session.channelId, session.messageId)
        if (config.debugMode) {
          session.app.logger.info(`[DEBUG] ✅ 已撤回嵌套转发消息`)
        }
      } catch (error) {
        if (config.debugMode) {
          session.app.logger.error(`[DEBUG] ❌ 撤回消息失败:`, error)
        }
      }
    }
  } catch (error) {
    if (config.debugMode) {
      session.app.logger.error('[DEBUG] 处理嵌套转发失败:', error.message)
    }
  }
}

/**
 * 判断是否应该撤回用户的消息
 */
function shouldRecallForUser(userId: string, config: Config): boolean {
  const recallType = config.nestedForwardDetection.action.recallType
  
  switch (recallType) {
    case 'global':
      return true
    case 'blacklist':
      return config.nestedForwardDetection.action.blacklistUsers.includes(userId)
    case 'none':
    default:
      return false
  }
}

/**
 * 检测可疑链接
 */
function detectSuspiciousLinks(content: string, config: Config, session?: Session): { hasSuspiciousLinks: boolean; suspiciousLinks: string[]; reasons: string[] } {
  if (!config.linkDetection.enabled) {
    return { hasSuspiciousLinks: false, suspiciousLinks: [], reasons: [] }
  }

  const suspiciousLinks: string[] = []
  const reasons: string[] = []
  
  try {
    // URL正则表达式，匹配http/https链接
    const urlRegex = /https?:\/\/[^\s<>"'{}|\\^`\[\]]+/gi
    const urls = content.match(urlRegex) || []
    
    if (urls.length === 0) {
      return { hasSuspiciousLinks: false, suspiciousLinks: [], reasons: [] }
    }

    if (config.debugMode && session) {
      session.app.logger.info(`[DEBUG] 🔗 链接检测开始，发现 ${urls.length} 个链接`)
    }

    for (const url of urls) {
      try {
        const urlObj = new URL(url)
        const hostname = urlObj.hostname.toLowerCase()
        const pathname = urlObj.pathname.toLowerCase()
        
        if (config.debugMode && session) {
          session.app.logger.info(`[DEBUG] 检测链接: ${url}`)
          session.app.logger.info(`[DEBUG] 域名: ${hostname}`)
        }
        
        // 检查是否为QQ图片链接（qq.com.cn域名），如果是则跳过可疑链接检测，直接进入视觉检测
        const qqImagePattern = /\.qq\.com\.cn$/i
        if (qqImagePattern.test(hostname)) {
          if (config.debugMode && session) {
            session.app.logger.info(`[DEBUG] ✅ 检测到QQ图片链接(${hostname})，跳过可疑链接检测，将进入视觉检测流程`)
          }
          continue
        }
        
        // 硬编码的白名单域名（用户无法删除或看到）
        const hardcodedWhitelistDomains = ['koishi.js.org']
        const isHardcodedWhitelisted = hardcodedWhitelistDomains.some(domain => 
          hostname === domain.toLowerCase() || hostname.endsWith('.' + domain.toLowerCase())
        )
        
        // 检查是否在配置的白名单中
        const isConfigWhitelisted = config.linkDetection.rules.whitelistDomains.some(domain => 
          hostname === domain.toLowerCase() || hostname.endsWith('.' + domain.toLowerCase())
        )
        
        const isWhitelisted = isHardcodedWhitelisted || isConfigWhitelisted
        
        if (isWhitelisted) {
          if (config.debugMode && session) {
            session.app.logger.info(`[DEBUG] ✅ 链接在白名单中，跳过检测`)
          }
          continue
        }
        
        let isSuspicious = false
        let reason = ''
        
        // 检测OSS对象存储链接
        if (config.linkDetection.rules.detectOSSLinks) {
          const ossPatterns = [
            /\.oss[\w-]*\.aliyuncs\.com/i,  // 阿里云OSS
            /\.cos\.[\w-]+\.myqcloud\.com/i, // 腾讯云COS
            /\.qiniudn\.com/i,              // 七牛云
            /\.qbox\.me/i,                  // 七牛云
            /\.clouddn\.com/i,             // 七牛云
            /\.ufileos\.com/i,             // UCloud
            /\.bcebos\.com/i,              // 百度云BOS
            /\.obs\.[\w-]+\.myhuaweicloud\.com/i, // 华为云OBS
            /\.ks3-[\w-]+\.ksyun\.com/i,  // 金山云KS3
          ]
          
          for (const pattern of ossPatterns) {
            if (pattern.test(hostname)) {
              isSuspicious = true
              reason = 'OSS对象存储链接'
              break
            }
          }
        }
        
        // 检测可疑域名关键词
        if (!isSuspicious && config.linkDetection.rules.suspiciousDomainKeywords.length > 0) {
          for (const keyword of config.linkDetection.rules.suspiciousDomainKeywords) {
            if (hostname.includes(keyword.toLowerCase()) || pathname.includes(keyword.toLowerCase())) {
              isSuspicious = true
              reason = `包含可疑关键词: ${keyword}`
              break
            }
          }
        }
        
        // 检测不知名域名
        if (!isSuspicious && config.linkDetection.rules.detectUnknownDomains) {
          // 常见域名后缀和知名域名模式
          const knownPatterns = [
            /\.(qq|tencent|weixin|wechat)\.com$/i,
            /\.(baidu|baidubce)\.com$/i,
            /\.(taobao|tmall|alibaba|aliyun|alipay)\.com$/i,
            /\.(jd|360buy)\.com$/i,
            /\.(github|gitlab|gitee)\.com$/i,
            /\.(bilibili|acfun)\.com$/i,
            /\.(zhihu|douban|jianshu)\.com$/i,
            /\.(weibo|sina)\.com$/i,
            /\.(douyin|toutiao|bytedance)\.com$/i,
            /\.(xiaohongshu|xhs)\.com$/i,
            /\.(kuaishou|kwai)\.com$/i,
            /\.(163|126|yeah)\.net$/i,
            /\.(sohu|sogou|soso)\.com$/i,
            /\.(youku|tudou|iqiyi|le)\.com$/i,
            /\.(microsoft|office|outlook|live)\.com$/i,
            /\.(google|youtube|gmail)\.com$/i,
            /\.(apple|icloud)\.com$/i,
            /\.(amazon|aws)\.com$/i,
            /\.(facebook|instagram|twitter)\.com$/i
          ]
          
          const isKnownDomain = knownPatterns.some(pattern => pattern.test(hostname))
          
          // 如果不是知名域名，且域名结构可疑（如包含随机字符、过长等）
          if (!isKnownDomain) {
            const domainParts = hostname.split('.')
            const mainDomain = domainParts[domainParts.length - 2] || ''
            
            // 检查域名是否可疑
            const suspiciousPatterns = [
              /^[a-z0-9]{8,}$/i,           // 纯随机字符
              /[0-9]{4,}/,                 // 包含4位以上数字
              /^[a-z]{1,3}[0-9]{3,}/i,     // 短字母+多数字
              /-[a-z0-9]{6,}/i,            // 包含长随机后缀
              /[a-z]{15,}/i                // 过长的字母串
            ]
            
            const hasSuspiciousPattern = suspiciousPatterns.some(pattern => pattern.test(mainDomain))
            
            if (hasSuspiciousPattern || mainDomain.length > 20) {
              isSuspicious = true
              reason = '不知名域名'
            }
          }
        }
        
        if (isSuspicious) {
          suspiciousLinks.push(url)
          reasons.push(reason)
          if (config.debugMode && session) {
            session.app.logger.info(`[DEBUG] ⚠️ 发现可疑链接: ${url} (${reason})`)
          }
        } else {
          if (config.debugMode && session) {
            session.app.logger.info(`[DEBUG] ✅ 链接检测通过: ${url}`)
          }
        }
        
      } catch (urlError) {
        // URL解析失败，可能是格式不正确的链接
        if (config.debugMode && session) {
          session.app.logger.debug(`[DEBUG] URL解析失败: ${url}`, urlError)
        }
      }
    }
    
    if (config.debugMode && session) {
      session.app.logger.info(`[DEBUG] 🔗 链接检测完成，发现 ${suspiciousLinks.length} 个可疑链接`)
    }
    
    return {
      hasSuspiciousLinks: suspiciousLinks.length > 0,
      suspiciousLinks,
      reasons
    }
    
  } catch (error) {
    if (config.debugMode && session) {
      session.app.logger.error('[DEBUG] 检测可疑链接时发生错误:', error)
    }
    return { hasSuspiciousLinks: false, suspiciousLinks: [], reasons: [] }
  }
}

/**
 * 处理可疑链接
 */
async function handleSuspiciousLinks(session: Session, config: Config, offenseTracker: OffenseTracker, suspiciousLinks: string[], reasons: string[]): Promise<void> {
  try {
    const action = config.linkDetection.action
    
    if (config.debugMode) {
      session.app.logger.info(`[DEBUG] 🎯 处理可疑链接`)
      session.app.logger.info(`[DEBUG] 用户: ${session.userId}, 群组: ${session.guildId}`)
      session.app.logger.info(`[DEBUG] 可疑链接: ${suspiciousLinks.join(', ')}`)
      session.app.logger.info(`[DEBUG] 检测原因: ${reasons.join(', ')}`)
    }
    
    // 处理违规计次
    let isRepeatOffense = false
    let offenseCount = 0
    
    if (config.repeatOffenseRules.enabled) {
      offenseCount = offenseTracker.addOffense(session.userId, session.guildId, '可疑链接检测')
      isRepeatOffense = offenseTracker.isRepeatOffense(session.userId, session.guildId)
      
      if (config.debugMode) {
        session.app.logger.info(`[DEBUG] 可疑链接违规计次: ${offenseCount}, 是否反复违规: ${isRepeatOffense}`)
      }
    }
    
    // 处理反复违规
    if (isRepeatOffense) {
      // 发送反复违规警告
      if (config.repeatOffenseRules.warningMessage) {
        try {
          const warningMsg = config.repeatOffenseRules.warningMessage
            .replace('{user}', `<@${session.userId}>`)
            .replace('{userId}', session.userId)
            .replace('{count}', offenseCount.toString())
            .replace('{threshold}', config.repeatOffenseRules.triggerThreshold.toString())
            .replace('{timeWindow}', config.repeatOffenseRules.timeWindow.toString())
          
          await sendNotificationWithAutoRecall(session, `<quote id="${session.messageId}"/>${warningMsg}`, config)
          if (config.debugMode) {
            session.app.logger.info(`[DEBUG] ✅ 已发送可疑链接反复违规警告消息`)
          }
        } catch (error) {
          if (config.debugMode) {
            session.app.logger.error('[DEBUG] ❌ 发送可疑链接反复违规警告失败:', error)
          }
        }
      }
      
      // 反复违规禁言
      try {
        await session.bot.muteGuildMember(session.guildId, session.userId, config.repeatOffenseRules.muteDuration * 60 * 1000)
        if (config.debugMode) {
          session.app.logger.info(`[DEBUG] ✅ 已执行可疑链接反复违规禁言: ${config.repeatOffenseRules.muteDuration} 分钟`)
        }
      } catch (error) {
        if (config.debugMode) {
          session.app.logger.error('[DEBUG] ❌ 可疑链接反复违规禁言失败:', error)
        }
      }
      
      // 踢出用户
      if (config.repeatOffenseRules.kickUser) {
        try {
          await session.bot.kickGuildMember(session.guildId, session.userId)
          if (config.debugMode) {
            session.app.logger.info(`[DEBUG] ✅ 已踢出反复违规用户（可疑链接）`)
          }
        } catch (error) {
          if (config.debugMode) {
            session.app.logger.error('[DEBUG] ❌ 踢出反复违规用户失败（可疑链接）:', error)
          }
        }
      }
    }
    
    // 撤回消息（无论是否反复违规都执行）
    if (action.recallMessage) {
      try {
        await session.bot.deleteMessage(session.channelId, session.messageId)
        if (config.debugMode) {
          session.app.logger.info(`[DEBUG] ✅ 已撤回包含可疑链接的消息`)
        }
      } catch (recallError) {
        if (config.debugMode) {
          session.app.logger.error('[DEBUG] ❌ 撤回可疑链接消息失败:', recallError)
        }
      }
    }
    
    if (!isRepeatOffense) {
       // 常规处理（仅在非反复违规时执行警告和禁言）
       // 发送警告消息
       if (action.sendWarning && action.warningMessage) {
        try {
          await sendNotificationWithAutoRecall(session, `<quote id="${session.messageId}"/>${action.warningMessage}`, config)
          if (config.debugMode) {
            session.app.logger.info(`[DEBUG] ✅ 已发送可疑链接警告消息`)
          }
        } catch (warningError) {
          if (config.debugMode) {
            session.app.logger.error('[DEBUG] ❌ 发送可疑链接警告消息失败:', warningError)
          }
        }
      }

      // 禁言用户
      if (action.muteUser && action.muteDuration > 0) {
        try {
          await session.bot.muteGuildMember(session.guildId, session.userId, action.muteDuration * 60 * 1000)
          if (config.debugMode) {
            session.app.logger.info(`[DEBUG] ✅ 已禁言用户 ${session.userId} ${action.muteDuration} 分钟（可疑链接）`)
          }
        } catch (muteError) {
          if (config.debugMode) {
            session.app.logger.error('[DEBUG] ❌ 禁言用户失败（可疑链接）:', muteError)
          }
        }
      }
    }
    
  } catch (error) {
    if (config.debugMode) {
      session.app.logger.error('[DEBUG] 处理可疑链接时发生错误:', error)
    }
  }
}

/**
 * 转发消息提取函数（完整解析每条消息）
 */
async function extractForwardMessagesRecursive(
  session: Session, 
  config: Config, 
  content: string, 
  currentDepth: number
): Promise<{ messages: string[], depthExceeded: boolean }> {
  const messages: string[] = []
  let depthExceeded = false
  const maxDepth = 3 // 最大递归深度
  
  try {
    // 检查递归深度
    if (currentDepth >= maxDepth) {
      if (config.debugMode) {
        session.app.logger.warn(`[DEBUG] ⚠️ 达到最大递归深度 ${maxDepth}，停止解析`)
      }
      return { messages: [content], depthExceeded: true }
    }
    
    // 使用新的检测函数检查是否包含转发消息
    const hasForwardMessage = isForwardMessage(content)
    
    if (config.debugMode) {
      const preview = content.length > 200 ? content.substring(0, 200) + '...' : content
      session.app.logger.info(`[DEBUG] 🔍 转发消息检测（深度: ${currentDepth}）`)
      session.app.logger.info(`[DEBUG] 检测内容: "${preview}"`)
      session.app.logger.info(`[DEBUG] 检测结果: ${hasForwardMessage ? '✅ 发现转发消息' : '❌ 未发现转发消息'}`)
    }
    
    if (!hasForwardMessage) {
      // 如果不是转发消息，直接返回内容
      return { messages: [content], depthExceeded }
    }
    
    // 使用新的提取函数获取所有转发消息ID
    const forwardIds = extractForwardIds(content)
    
    if (config.debugMode) {
      session.app.logger.info(`[DEBUG] 🎯 转发ID提取结果: ${forwardIds.length > 0 ? `找到 ${forwardIds.length} 个ID [${forwardIds.join(', ')}]` : '未找到任何ID'}`)
    }
    
    if (forwardIds.length === 0) {
      if (config.debugMode) {
        session.app.logger.warn(`[DEBUG] ⚠️ 检测到转发消息但无法提取ID，可能是格式问题`)
      }
      return { messages: [content], depthExceeded }
    }
    
    // 处理每个转发消息
    for (const forwardMessageId of forwardIds) {
      try {
        // 使用 OneBot 的 /get_forward_msg 接口获取转发消息内容
        let forwardData = null
        
        if (session.onebot) {
          try {
            if (config.debugMode) {
              session.app.logger.info(`[DEBUG] 📡 开始调用 OneBot API 获取转发消息，ID: ${forwardMessageId}`)
            }
            
            // 使用 OneBot API 获取转发消息
            forwardData = await session.onebot.getForwardMsg(forwardMessageId)
            
            if (config.debugMode) {
              const dataType = Array.isArray(forwardData) ? 'Array' : typeof forwardData
              const dataSize = Array.isArray(forwardData) ? forwardData.length : 
                              (forwardData && typeof forwardData === 'object') ? Object.keys(forwardData).length : 0
              session.app.logger.info(`[DEBUG] ✅ OneBot API 调用成功，ID: ${forwardMessageId}`)
              session.app.logger.info(`[DEBUG] 返回数据类型: ${dataType}, 大小: ${dataSize}`)
            }
          } catch (apiError) {
            if (config.debugMode) {
              session.app.logger.warn(`[DEBUG] ❌ OneBot API 调用失败，ID: ${forwardMessageId}`)
              session.app.logger.warn(`[DEBUG] 错误详情: ${apiError.message}`)
            }
          }
        }
        
        // 处理获取到的转发消息数据
        let messageList = null
        
        if (forwardData) {
          // OneBot API 直接返回消息数组
          if (Array.isArray(forwardData)) {
            messageList = forwardData
          }
          // 或者返回包含 messages 字段的对象
          else if (forwardData.messages && Array.isArray(forwardData.messages)) {
            messageList = forwardData.messages
          }
        }
        
        // 处理获取到的消息列表
        if (messageList && Array.isArray(messageList) && messageList.length > 0) {
          if (config.debugMode) {
            session.app.logger.info(`[DEBUG] 成功获取到转发消息列表，开始处理 ${messageList.length} 条消息 (转发ID: ${forwardMessageId})`)
          }
          
          for (const msg of messageList) {
            let extractedContent = ''
            
            // 优先使用 raw_message 字段（原始消息文本）
            if (msg.raw_message && typeof msg.raw_message === 'string') {
              const originalContent = msg.raw_message.trim()
              extractedContent = originalContent
              
              if (config.debugMode) {
                session.app.logger.info(`[DEBUG] 原始raw_message内容: ${originalContent}`)
              }
              
              // 解析 raw_message 中的 CQ 码格式图片并转换为 img 标签
              extractedContent = parseCQCodeImages(extractedContent, config, session)
              
              if (config.debugMode && extractedContent !== originalContent) {
                session.app.logger.info(`[DEBUG] CQ码解析后内容: ${extractedContent}`)
              }
            }
            // 备用：解析 message 数组中的内容
            else if (Array.isArray(msg.message)) {
              const { textParts, forwardParts, imageParts } = parseMessageSegments(msg.message, config, session)
              
              // 分别处理文本、转发和图片内容
              // 文本和转发内容合并
              const textAndForwardParts = [...textParts, ...forwardParts]
              let textContent = textAndForwardParts.join('').trim()
              
              // 图片内容单独处理，确保保持img标签格式
              if (imageParts.length > 0) {
                // 将图片标签添加到文本内容中，保持独立的img标签格式
                const imageContent = imageParts.join('')
                extractedContent = textContent + imageContent
              } else {
                extractedContent = textContent
              }
              
              if (config.debugMode) {
                if (forwardParts.length > 0) {
                  session.app.logger.info(`[DEBUG] 从message数组提取到 ${forwardParts.length} 个内嵌转发: ${forwardParts.join(', ')}`)
                }
                if (imageParts.length > 0) {
                  session.app.logger.info(`[DEBUG] 从message数组提取到 ${imageParts.length} 个图片: ${imageParts.join(', ')}`)
                  const imageContent = imageParts.join('')
                  session.app.logger.info(`[DEBUG] 图片内容: ${imageContent}`)
                }
              }
            }
            
            // 检查提取的内容是否包含内嵌的转发消息
             if (extractedContent.length > 0) {
               const hasNestedForward = detectNestedForward(extractedContent, config, session, true)
               
               if (hasNestedForward) {
                 // 检测到嵌套转发，触发嵌套转发处理
                 await handleNestedForward(session, config)
                 
                 // 递归处理内嵌的转发消息
                 const nestedResult = await extractForwardMessagesRecursive(
                   session, 
                   config, 
                   extractedContent, 
                   currentDepth + 1
                 )
                 
                 messages.push(...nestedResult.messages)
                 
                 if (nestedResult.depthExceeded) {
                   depthExceeded = true
                 }
               } else {
                 // 普通文本内容，直接添加
                 messages.push(extractedContent)
               }
             }
          }
        } else {
          if (config.debugMode) {
            session.app.logger.warn(`[DEBUG] 无法获取转发消息详情，转发ID: ${forwardMessageId}`)
          }
          // 无法解析时，添加提示信息
          messages.push(`[检测到转发消息但无法解析内容，建议人工审核 - 转发ID: ${forwardMessageId}]`)
        }
      } catch (error) {
        if (config.debugMode) {
          session.app.logger.error(`[DEBUG] 获取转发消息失败 (转发ID: ${forwardMessageId}):`, error.message)
        }
        // 获取失败时，添加提示信息
        messages.push(`[检测到转发消息但获取失败，建议人工审核 - 转发ID: ${forwardMessageId}]`)
      }
    }
    
    return { messages, depthExceeded }
  } catch (error) {
    if (config.debugMode) {
      session.app.logger.error('[DEBUG] 转发消息解析失败:', error.message)
    }
    return { messages: [content], depthExceeded: false }
  }
}



/**
 * 使用 AI 检测消息是否为广告（带重试机制和超时控制）
 */
async function detectAdvertisement(ctx: Context, config: Config, content: string): Promise<boolean> {
  const maxRetries = 3
  const baseDelay = 1000 // 基础延迟1秒
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await detectAdvertisementCore(ctx, config, content)
    } catch (error) {
      if (config.debugMode) {
        ctx.logger.warn(`[DEBUG] AI检测失败，第${attempt}/${maxRetries}次尝试: ${error.message}`)
      }
      
      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        throw error
      }
      
      // 指数退避延迟
      const delay = baseDelay * Math.pow(2, attempt - 1)
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 等待${delay}ms后重试...`)
      }
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  // 理论上不会到达这里
  throw new Error('所有重试都失败了')
}

/**
 * 检测QQ空间分享消息
 */
function detectQQSpaceShare(content: string): boolean {
  try {
    // 检测JSON格式的QQ空间分享消息
    if (content.includes('"app":"com.tencent.miniapp.lua"') && 
        content.includes('"bizsrc":"qzone.albumshare"') &&
        content.includes('"view":"miniapp"')) {
      return true
    }
    
    // 检测其他可能的QQ空间分享特征
    if (content.includes('空间相册') || 
        content.includes('QQ空间相册') ||
        content.includes('qzone.qq.com') ||
        content.includes('mobile.qzone.qq.com')) {
      return true
    }
    
    // 检测分享标识
    if (content.includes('[分享]') && 
        (content.includes('空间') || content.includes('相册'))) {
      return true
    }
    
    return false
  } catch (error) {
    return false
  }
}

/**
 * QQ空间分享消息专用广告检测（高敏感度）
 */
async function detectQQSpaceAdvertisement(ctx: Context, config: Config, content: string): Promise<boolean> {
  // 提取QQ空间分享的关键信息
  let extractedContent = ''
  
  try {
    // 尝试解析JSON格式的分享消息
    const jsonMatch = content.match(/\{[^}]+\}/)
    if (jsonMatch) {
      const shareData = JSON.parse(jsonMatch[0])
      
      // 提取标题、描述等关键信息
      if (shareData.meta && shareData.meta.miniapp) {
        const miniapp = shareData.meta.miniapp
        extractedContent += (miniapp.title || '') + ' '
        extractedContent += (miniapp.source || '') + ' '
        extractedContent += (miniapp.tag || '') + ' '
      }
      
      // 提取其他可能的文本信息
      extractedContent += (shareData.desc || '') + ' '
      extractedContent += (shareData.prompt || '') + ' '
      extractedContent += (shareData.text || '') + ' '
    }
  } catch (error) {
    // JSON解析失败，使用原始内容
    extractedContent = content
  }
  
  // 如果没有提取到有效内容，使用原始内容
  if (!extractedContent.trim()) {
    extractedContent = content
  }
  
  if (config.debugMode) {
    ctx.logger.info(`[DEBUG] QQ空间分享提取内容: "${extractedContent.substring(0, 200)}${extractedContent.length > 200 ? '...' : ''}"`)
  }
  
  // 使用高敏感度检测
  return await detectAdvertisementCoreWithSensitivity(ctx, config, extractedContent, 10)
}

/**
 * 带敏感度参数的AI检测核心逻辑
 */
async function detectAdvertisementCoreWithSensitivity(ctx: Context, config: Config, content: string, overrideSensitivity?: number): Promise<boolean> {
  // 使用指定的敏感度或配置的敏感度
  const sensitivityLevel = overrideSensitivity || config.sensitivity
  
  // 构建系统提示词 - 按优先级组合：核心提示词 > 用户提示词 > 默认规则提示词
  let systemPrompt = ''
  
  // 1. 核心提示词（最高优先级，始终存在）
  const corePrompt = `你是一个专业的广告监测机器人，负责识别群聊中的广告、垃圾信息和不当内容。你需要准确判断消息是否为广告，避免误杀正常聊天内容。`
  systemPrompt += corePrompt
  
  // 2. QQ空间分享特殊提示词（针对QQ空间分享消息的特殊规则）
  if (overrideSensitivity === 10) {
    systemPrompt += '\n\n特别注意：当前检测的是QQ空间分享消息。这类消息通常文本内容较少，但经常被用于引流和广告推广。请采用极高敏感度进行检测，对任何可能的商业推广、引流行为都要高度警惕。宁可错杀，也不能放过。'
  }
  
  // 3. 用户自定义提示词（第二优先级）
  if (config.aiModel.customPrompt && config.aiModel.customPrompt.trim()) {
    systemPrompt += '\n\n' + config.aiModel.customPrompt.trim()
    if (config.debugMode) {
      ctx.logger.info('[DEBUG] 已添加用户自定义提示词')
    }
  }
  
  // 4. 默认规则提示词（最低优先级，在没有用户提示词或不冲突时使用）
  if (!config.aiModel.customPrompt || !config.aiModel.customPrompt.trim()) {
    const defaultRulesPrompt = `

重要判定原则：
1. 合理性判断：区分正常分享、群内活动与恶意推广
2. 伪造识别：警惕伪造的"群公告"、"系统通知"等欺骗性内容
3. 意图分析：重点关注是否有明确的商业推广或引流意图
4. 网络文化识别：区分网络热梗、流行语、表情包文字与真正的商业推广
5. 广告词识别：警惕模糊化的广告词
6. 链接分析：警惕诱导用户点击的邀请链接
7. 企业招募：警惕企业招聘广告（如"群内有xxx岗位空缺，有意向者请加群")
8. 空间引流：警惕QQ空间分享等功能的引流行为
9. 文字混淆：警惕谐音，字形相似等文字来混淆检测的行为（如"约字可能被混淆为月、🈷、箹等字"）

常见误判避免：
• 群友间的正常分享（如游戏礼包码、优惠信息分享）
• 群管理员发布的真实群公告或活动信息
• 单纯的"免费领取"信息
• 技术讨论中提到的产品或服务名称
• 网络热梗和流行语（如"干就完了"、"冲冲冲"等网络用语）
• 表情包文字、段子、调侃内容
• 游戏术语、网络流行词汇
• 对于专业的中介内容，可以被视为广告
• 带暑假工、临时工字样的推广话语可以被视为广告（需判定是否是学生的个人对话）

真正的广告特征：
• 明确要求添加微信/QQ进行交易
• 推销具体产品并提供联系方式
• 企业招聘
• 刷单、兼职等明显诈骗信息
• 广告词（网络热梗除外）
• 色情、赌博等违法服务推广
• 招聘类广告：暑假工、兼职、高薪工作等（特别是含有"安置"、"安排"、"待遇"等词汇）
• 私域流量推广：鼓励加入某个群体或平台进行赚钱
• 投资理财诱导：暗示轻松赚钱、不劳而获的内容
• 模糊承诺：使用"机会"、"项目"、"合作"等模糊词汇进行引流`
    systemPrompt += defaultRulesPrompt
    
    if (config.debugMode) {
      ctx.logger.info('[DEBUG] 已添加默认规则提示词')
    }
  } else {
    if (config.debugMode) {
      ctx.logger.info('[DEBUG] 检测到用户自定义提示词，跳过默认规则提示词以避免冲突')
    }
  }
  
  // 为系统提示词添加敏感度相关的检测标准（无论是否使用自定义提示词）
  if (sensitivityLevel <= 3) {
    systemPrompt += '\n\n检测标准：宽松模式，只有明显的商业推广和垃圾信息才判定为广告。对于模糊情况，倾向于判定为非广告。'
  } else if (sensitivityLevel <= 6) {
    systemPrompt += '\n\n检测标准：中等模式，平衡准确性与误杀率，对可能的商业内容保持适度警惕。'
  } else if (sensitivityLevel <= 9) {
    systemPrompt += '\n\n检测标准：严格模式，对任何可能的商业推广、引流行为都要高度警惕，但仍需避免明显的误判。'
  } else {
    systemPrompt += '\n\n检测标准：极严格模式，对任何可能的商业推广、引流、营销行为都要极度警惕。宁可错杀，也不能放过。特别关注QQ空间分享等引流行为。'
  }
  
  // Tokens优化：简化输出要求
  if (config.performance.tokenOptimization.enabled) {
    systemPrompt += '\n\n请严格按照要求只回答"是"或"否"，不要包含任何解释、分析或其他内容。'
  } else {
    systemPrompt += '\n\n请严格按照要求只回答"是"或"否"。'
  }
  
  // 根据敏感度调整用户提示的详细程度
  let userPrompt = `请仔细分析以下消息内容是否为广告，重点关注：

1. 商业意图：是否有明确的盈利或引流目的？
2. 真实性：是否存在伪造官方身份的情况？
3. 完整性：消息是否包含完整的推广链条？

特别注意：`
  
  if (sensitivityLevel >= 10) {
    userPrompt += `
• 极严格检查：任何可能的商业推广、引流、营销行为
• QQ空间分享引流：特别警惕通过空间分享进行的引流行为
• 推销产品/服务、引导加微信/QQ、刷单兼职、投资理财、色情服务、代购代理、培训课程、游戏推广、APP推广、网站推广等
• 招聘类广告：暑假工、兼职招聘（特别注意"安置"、"安排"、"待遇"、"招聘"等关键词）
• 私域流量：鼓励加群、建立社群、"干就完了"、"试了才知道"等煽动性语言
• 投资诱导：暗示轻松赚钱、"不要犹豫"、"注定要穷"等心理操控话术
• 伪造识别：警惕伪造的"群公告"、"系统消息"、"官方通知"等
• 引流行为：任何试图将用户引导到其他平台的行为
• 宁可错杀，也不能放过任何可疑内容`
  } else if (sensitivityLevel >= 7) {
    userPrompt += `
• 严格检查：推销产品/服务、引导加微信/QQ、刷单兼职、投资理财、色情服务、代购代理、培训课程、游戏推广、APP推广、网站推广等
• 招聘类广告：暑假工、兼职招聘（特别注意"安置"、"安排"、"待遇"、"招聘"等关键词）
• 私域流量：鼓励加群、建立社群、"干就完了"、"试了才知道"等煽动性语言
• 投资诱导：暗示轻松赚钱、"不要犹豫"、"注定要穷"等心理操控话术
• 伪造识别：警惕伪造的"群公告"、"系统消息"、"官方通知"等
• 引流行为：任何试图将用户引导到其他平台的行为`
  } else if (sensitivityLevel >= 4) {
    userPrompt += `
• 重点关注：推销产品/服务、引导加微信/QQ、刷单兼职、投资理财、色情服务等
• 招聘类广告：明显的暑假工、兼职招聘信息（注意"安置"、"安排"、"待遇"等词汇）
• 私域流量：明显的拉群、建群、赚钱项目推广
• 伪造识别：注意伪造的官方身份或虚假通知
• 但要区分：正常的分享、讨论、群内活动等`
  } else {
    userPrompt += `
• 仅检测：明显的商业推销、诈骗信息、色情服务等
• 对于模糊情况，倾向于判定为正常消息
• 重点关注有明确联系方式和交易意图的内容`
  }
  
  // Tokens优化：简化用户提示词
  if (config.performance.tokenOptimization.enabled) {
    userPrompt += `\n\n消息内容："${content}"\n\n请判断这条消息是否为广告。只回答 "是" 或 "否"。`
  } else {
    userPrompt += `\n\n消息内容："${content}"\n\n分析要点：
- 这条消息的主要目的是什么？
- 是否要求用户进行某种行动（如添加联系方式、购买产品）？
- 是否存在伪造身份的迹象？
- 在群聊环境中，这样的消息是否合理？
- 是否为网络热梗、流行语、表情包文字或纯粹的娱乐内容？
- 是否具有明确的网络文化背景，而非商业推广意图？

请只回答 "是" 或 "否"，不要包含其他内容。当前检测敏感度：${sensitivityLevel}/10`
  }

  // 根据敏感度调整 temperature（敏感度越高，temperature 越低，判断越严格）
  const temperature = Math.max(0.1, 0.3 - (sensitivityLevel - 1) * 0.02)
  
  // Tokens优化：调整max_tokens参数
  const maxTokens = config.performance.tokenOptimization.enabled ? 10 : 50
  
  const requestData = {
    model: config.aiModel.modelName,
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ],
    max_tokens: maxTokens,
    temperature: temperature
  }

  // 构建正确的 OpenAI 兼容 API 端点
  const apiEndpoint = buildApiEndpoint(config.aiModel.endpoint)

  if (config.debugMode) {
    ctx.logger.info(`[DEBUG] 敏感度配置: ${sensitivityLevel}/10 ${overrideSensitivity ? '(QQ空间分享专用)' : ''}`)
    ctx.logger.info(`[DEBUG] Temperature 调整: ${temperature}`)
    ctx.logger.info(`[DEBUG] 检测策略: ${sensitivityLevel <= 3 ? '宽松' : sensitivityLevel <= 6 ? '中等' : sensitivityLevel <= 9 ? '严格' : '极严格'}`)
    ctx.logger.info(`[DEBUG] 提示词组合策略: 核心提示词 + ${overrideSensitivity === 10 ? 'QQ空间特殊提示词 + ' : ''}${config.aiModel.customPrompt ? '用户自定义提示词' : '默认规则提示词'}`)
    if (config.aiModel.customPrompt) {
      ctx.logger.info(`[DEBUG] 用户自定义提示词: ${config.aiModel.customPrompt}`)
    }
    ctx.logger.info(`[DEBUG] Tokens优化: ${config.performance.tokenOptimization.enabled ? '已启用' : '未启用'} (max_tokens: ${maxTokens})`)
    ctx.logger.info(`[DEBUG] 最终系统提示词长度: ${systemPrompt.length} 字符`)
    ctx.logger.info('[DEBUG] AI 请求数据:', JSON.stringify(requestData, null, 2))
    ctx.logger.info(`[DEBUG] 原始端点: ${config.aiModel.endpoint}`)
    ctx.logger.info(`[DEBUG] 修正后端点: ${apiEndpoint}`)
  }

  // 智能重试机制 - 针对503等服务不可用错误优化
  let lastError: any
  let baseDelay = config.aiModel.retryDelay
  
  for (let attempt = 0; attempt <= config.aiModel.retryCount; attempt++) {
    // 创建取消控制器
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => {
      abortController.abort()
    }, config.aiModel.timeout)

    try {
      // 获取当前API密钥
      const { apiKey, nextIndex } = ApiKeyManager.getNextApiKey(
        config.aiModel.apiKeys, 
        config.aiModel.currentKeyIndex
      )
      config.aiModel.currentKeyIndex = nextIndex

      if (config.debugMode && attempt > 0) {
        ctx.logger.info(`[DEBUG] 第${attempt + 1}次尝试，使用API密钥索引: ${config.aiModel.currentKeyIndex}`)
      }

      const response = await ctx.http.post(apiEndpoint, requestData, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: abortController.signal,
        timeout: config.aiModel.timeout
      })

      clearTimeout(timeoutId)

      if (config.debugMode) {
        ctx.logger.info('[DEBUG] AI 响应:', JSON.stringify(response, null, 2))
      }

      if (response && response.choices && response.choices.length > 0) {
        const result = response.choices[0].message?.content?.trim().toLowerCase()
        
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] AI 检测结果: "${result}"`)
        }
        
        // 解析结果
        if (result === '是' || result === 'yes' || result === '1' || result === 'true') {
          return true
        } else if (result === '否' || result === 'no' || result === '0' || result === 'false') {
          return false
        } else {
          // 如果结果不明确，根据敏感度决定
          if (config.debugMode) {
            ctx.logger.warn(`[DEBUG] AI返回结果不明确: "${result}"，根据敏感度${sensitivityLevel}进行判断`)
          }
          
          // 高敏感度时，不明确的结果倾向于判定为广告
          return sensitivityLevel >= 8
        }
      } else {
        throw new Error('AI 响应格式异常或为空')
      }
    } catch (error) {
      clearTimeout(timeoutId)
      lastError = error
      
      const statusCode = error.response?.status
      const errorType = getErrorType(error, statusCode)
      
      if (config.debugMode) {
        ctx.logger.warn(`[DEBUG] AI检测失败 (尝试${attempt + 1}/${config.aiModel.retryCount + 1}): ${error.message}`)
        ctx.logger.warn(`[DEBUG] 错误类型: ${errorType}, 状态码: ${statusCode || 'N/A'}`)
      }
      
      // 检查是否应该重试
      if (attempt < config.aiModel.retryCount && isErrorRetryable(error, statusCode)) {
        const retryDelay = calculateRetryDelay(attempt, baseDelay, statusCode, error.name)
        
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] 将在${retryDelay}ms后重试...`)
        }
        
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        continue
      } else {
        // 不可重试的错误或达到最大重试次数
        if (config.debugMode) {
          ctx.logger.warn(`[DEBUG] 停止重试: ${!isErrorRetryable(error, statusCode) ? '错误不可重试' : '达到最大重试次数'}`)
        }
        break
      }
    }
  }
  
  // 所有重试都失败了
  const errorType = getErrorType(lastError, lastError?.response?.status)
  throw new Error(`AI检测失败 (${errorType}): ${lastError?.message || '未知错误'}`)
}

/**
 * AI检测核心逻辑
 */
async function detectAdvertisementCore(ctx: Context, config: Config, content: string): Promise<boolean> {
  return await detectAdvertisementCoreWithSensitivity(ctx, config, content)
}

/**
 * AI检测核心逻辑（原始版本，保持向后兼容）
 */
async function detectAdvertisementCoreOriginal(ctx: Context, config: Config, content: string): Promise<boolean> {
  // 根据敏感度调整检测策略
  const sensitivityLevel = config.sensitivity
  
  // 构建系统提示词 - 按优先级组合：核心提示词 > 用户提示词 > 默认规则提示词
  let systemPrompt = ''
  
  // 1. 核心提示词（最高优先级，始终存在）
  const corePrompt = `你是一个专业的广告监测机器人，负责识别群聊中的广告、垃圾信息和不当内容。你需要准确判断消息是否为广告，避免误杀正常聊天内容。`
  systemPrompt += corePrompt
  
  // 2. 用户自定义提示词（第二优先级）
  if (config.aiModel.customPrompt && config.aiModel.customPrompt.trim()) {
    systemPrompt += '\n\n' + config.aiModel.customPrompt.trim()
    if (config.debugMode) {
      ctx.logger.info('[DEBUG] 已添加用户自定义提示词')
    }
  }
  
  // 3. 默认规则提示词（最低优先级，在没有用户提示词或不冲突时使用）
  if (!config.aiModel.customPrompt || !config.aiModel.customPrompt.trim()) {
    const defaultRulesPrompt = `

重要判定原则：
1. 合理性判断：区分正常分享、群内活动与恶意推广
2. 伪造识别：警惕伪造的"群公告"、"系统通知"等欺骗性内容
3. 意图分析：重点关注是否有明确的商业推广或引流意图
4. 网络文化识别：区分网络热梗、流行语、表情包文字与真正的商业推广
5. 广告词识别：警惕模糊化的广告词
6. 链接分析：警惕诱导用户点击的邀请链接
7. 企业招募：警惕企业招聘广告（如"群内有xxx岗位空缺，有意向者请加群")
8. 空间引流：警惕QQ空间分享等功能的引流行为
9. 文字混淆：警惕谐音，字形相似等文字来混淆检测的行为（如“约字可能被混淆为月、🈷、箹等字”）

常见误判避免：
• 群友间的正常分享（如游戏礼包码、优惠信息分享）
• 群管理员发布的真实群公告或活动信息
• 单纯的"免费领取"信息
• 技术讨论中提到的产品或服务名称
• 网络热梗和流行语（如"干就完了"、"冲冲冲"等网络用语）
• 表情包文字、段子、调侃内容
• 游戏术语、网络流行词汇
• 对于专业的中介内容，可以被视为广告
• 带暑假工、临时工字样的推广话语可以被视为广告（需判定是否是学生的个人对话）

真正的广告特征：
• 明确要求添加微信/QQ进行交易
• 推销具体产品并提供联系方式
• 企业招聘
• 刷单、兼职等明显诈骗信息
• 广告词（网络热梗除外）
• 色情、赌博等违法服务推广
• 招聘类广告：暑假工、兼职、高薪工作等（特别是含有"安置"、"安排"、"待遇"等词汇）
• 私域流量推广：鼓励加入某个群体或平台进行赚钱
• 投资理财诱导：暗示轻松赚钱、不劳而获的内容
• 模糊承诺：使用"机会"、"项目"、"合作"等模糊词汇进行引流`
    systemPrompt += defaultRulesPrompt
    
    if (config.debugMode) {
      ctx.logger.info('[DEBUG] 已添加默认规则提示词')
    }
  } else {
    if (config.debugMode) {
      ctx.logger.info('[DEBUG] 检测到用户自定义提示词，跳过默认规则提示词以避免冲突')
    }
  }
  
  // 为系统提示词添加敏感度相关的检测标准（无论是否使用自定义提示词）
  if (sensitivityLevel <= 3) {
    systemPrompt += '\n\n检测标准：宽松模式，只有明显的商业推广和垃圾信息才判定为广告。对于模糊情况，倾向于判定为非广告。'
  } else if (sensitivityLevel <= 6) {
    systemPrompt += '\n\n检测标准：中等模式，平衡准确性与误杀率，对可能的商业内容保持适度警惕。'
  } else {
    systemPrompt += '\n\n检测标准：严格模式，对任何可能的商业推广、引流行为都要高度警惕，但仍需避免明显的误判。'
  }
  
  // Tokens优化：简化输出要求
  if (config.performance.tokenOptimization.enabled) {
    systemPrompt += '\n\n请严格按照要求只回答"是"或"否"，不要包含任何解释、分析或其他内容。'
  } else {
    systemPrompt += '\n\n请严格按照要求只回答"是"或"否"。'
  }
  
  // 根据敏感度调整用户提示的详细程度
  let userPrompt = `请仔细分析以下消息内容是否为广告，重点关注：

1. 商业意图：是否有明确的盈利或引流目的？
2. 真实性：是否存在伪造官方身份的情况？
3. 完整性：消息是否包含完整的推广链条？

特别注意：`
  
  if (sensitivityLevel >= 7) {
    userPrompt += `
• 严格检查：推销产品/服务、引导加微信/QQ、刷单兼职、投资理财、色情服务、代购代理、培训课程、游戏推广、APP推广、网站推广等
• 招聘类广告：暑假工、兼职招聘（特别注意"安置"、"安排"、"待遇"、"招聘"等关键词）
• 私域流量：鼓励加群、建立社群、"干就完了"、"试了才知道"等煽动性语言
• 投资诱导：暗示轻松赚钱、"不要犹豫"、"注定要穷"等心理操控话术
• 伪造识别：警惕伪造的"群公告"、"系统消息"、"官方通知"等
• 引流行为：任何试图将用户引导到其他平台的行为`
  } else if (sensitivityLevel >= 4) {
    userPrompt += `
• 重点关注：推销产品/服务、引导加微信/QQ、刷单兼职、投资理财、色情服务等
• 招聘类广告：明显的暑假工、兼职招聘信息（注意"安置"、"安排"、"待遇"等词汇）
• 私域流量：明显的拉群、建群、赚钱项目推广
• 伪造识别：注意伪造的官方身份或虚假通知
• 但要区分：正常的分享、讨论、群内活动等`
  } else {
    userPrompt += `
• 仅检测：明显的商业推销、诈骗信息、色情服务等
• 对于模糊情况，倾向于判定为正常消息
• 重点关注有明确联系方式和交易意图的内容`
  }
  
  // Tokens优化：简化用户提示词
  if (config.performance.tokenOptimization.enabled) {
    userPrompt += `\n\n消息内容："${content}"\n\n请判断这条消息是否为广告。只回答 "是" 或 "否"。`
  } else {
    userPrompt += `\n\n消息内容："${content}"\n\n分析要点：
- 这条消息的主要目的是什么？
- 是否要求用户进行某种行动（如添加联系方式、购买产品）？
- 是否存在伪造身份的迹象？
- 在群聊环境中，这样的消息是否合理？
- 是否为网络热梗、流行语、表情包文字或纯粹的娱乐内容？
- 是否具有明确的网络文化背景，而非商业推广意图？

请只回答 "是" 或 "否"，不要包含其他内容。当前检测敏感度：${sensitivityLevel}/10`
  }

  // 根据敏感度调整 temperature（敏感度越高，temperature 越低，判断越严格）
  const temperature = Math.max(0.1, 0.3 - (sensitivityLevel - 1) * 0.02)
  
  // Tokens优化：调整max_tokens参数
  const maxTokens = config.performance.tokenOptimization.enabled ? 10 : 50
  
  const requestData = {
    model: config.aiModel.modelName,
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ],
    max_tokens: maxTokens,
    temperature: temperature
  }

  // 构建正确的 OpenAI 兼容 API 端点
  const apiEndpoint = buildApiEndpoint(config.aiModel.endpoint)

  if (config.debugMode) {
    ctx.logger.info(`[DEBUG] 敏感度配置: ${sensitivityLevel}/10`)
    ctx.logger.info(`[DEBUG] Temperature 调整: ${temperature}`)
    ctx.logger.info(`[DEBUG] 检测策略: ${sensitivityLevel <= 3 ? '宽松' : sensitivityLevel <= 6 ? '中等' : '严格'}`)
    ctx.logger.info(`[DEBUG] 提示词组合策略: 核心提示词 + ${config.aiModel.customPrompt ? '用户自定义提示词' : '默认规则提示词'}`)
    if (config.aiModel.customPrompt) {
      ctx.logger.info(`[DEBUG] 用户自定义提示词: ${config.aiModel.customPrompt}`)
    }
    ctx.logger.info(`[DEBUG] Tokens优化: ${config.performance.tokenOptimization.enabled ? '已启用' : '未启用'} (max_tokens: ${maxTokens})`)
    ctx.logger.info(`[DEBUG] 最终系统提示词长度: ${systemPrompt.length} 字符`)
    ctx.logger.info('[DEBUG] AI 请求数据:', JSON.stringify(requestData, null, 2))
    ctx.logger.info(`[DEBUG] 原始端点: ${config.aiModel.endpoint}`)
    ctx.logger.info(`[DEBUG] 修正后端点: ${apiEndpoint}`)
  }

  // 智能重试机制 - 针对503等服务不可用错误优化
  let lastError: any
  let baseDelay = config.aiModel.retryDelay
  
  for (let attempt = 0; attempt <= config.aiModel.retryCount; attempt++) {
    // 创建取消控制器
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => {
      abortController.abort()
      if (config.debugMode) {
        ctx.logger.warn(`[DEBUG] 请求超时，已取消第 ${attempt + 1} 次请求`)
      }
    }, config.aiModel.timeout)
    
    try {
      if (config.debugMode && attempt > 0) {
        ctx.logger.info(`[DEBUG] 第 ${attempt + 1} 次尝试请求 AI API`)
      }
      
      // 获取当前API密钥
      const { apiKey, nextIndex } = ApiKeyManager.getNextApiKey(
        config.aiModel.apiKeys, 
        config.aiModel.currentKeyIndex || 0
      )
      
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] AI模型使用API密钥索引: ${config.aiModel.currentKeyIndex || 0}`)
      }
      
      const response = await ctx.http.post(apiEndpoint, requestData, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: config.aiModel.timeout,
        signal: abortController.signal
      })
      
      // 请求成功，更新密钥索引
      config.aiModel.currentKeyIndex = nextIndex
      
      // 清除超时定时器
      clearTimeout(timeoutId)

      if (config.debugMode) {
        ctx.logger.info('[DEBUG] AI 响应数据:', JSON.stringify(response, null, 2))
      }

      // 检查响应格式
      if (!response || !response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
        throw new Error('AI 响应格式错误: choices 数组为空或不存在')
      }

      const choice = response.choices[0]
      if (!choice || !choice.message || typeof choice.message.content !== 'string') {
        throw new Error('AI 响应格式错误: message.content 不存在或不是字符串')
      }

      const result = choice.message.content.trim().toLowerCase()
      
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] AI 原始回复: "${choice.message.content}"`)
        ctx.logger.info(`[DEBUG] 处理后结果: "${result}"`)
      }

      // 基于敏感度的判定逻辑
      let isAd = false
      
      // 基础判定 - 明确的肯定回答
      const definiteAd = result.includes('是') || result.includes('yes') || result.includes('true')
      
      // 扩展判定 - 包含广告相关词汇
      const extendedAdDetection = result.includes('广告') || result.includes('advertisement') || 
                                 result.includes('spam') || result.includes('推广') ||
                                 result.includes('招聘') || result.includes('兼职') ||
                                 result.includes('私域') || result.includes('引流')
      
      // 模糊判定 - 可能性词汇
      const ambiguousDetection = result.includes('可能') || result.includes('疑似') || 
                                result.includes('maybe') || result.includes('possibly') ||
                                result.includes('likely') || result.includes('probable')
      
      // 网络热梗和流行语过滤 - 常见的网络用语不应被判定为广告
      const internetSlang = ['冲冲冲', '干就完了', '奥利给', '绝绝子', '芜湖', 'yyds', '破防了', '整活', '摆烂', '内卷', '躺平', '社死', '破防', '拿捏', '格局', '懂的都懂', '6666', '牛逼', '厉害了', '哈哈哈', '笑死', '绝了'];
      const hasInternetSlang = internetSlang.some(slang => content.includes(slang));
      
      // 如果包含网络热梗，降低广告判定的可能性
      if (hasInternetSlang && !definiteAd) {
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] 检测到网络热梗内容，降低广告判定严格度`);
        }
        // 对于网络热梗内容，只有在非常明确的情况下才判定为广告
        isAd = definiteAd && extendedAdDetection;
      } else {
        // 根据敏感度调整判定策略
        if (sensitivityLevel >= 8) {
          // 高敏感度：包含模糊判定
          isAd = definiteAd || extendedAdDetection || ambiguousDetection
        } else if (sensitivityLevel >= 6) {
          // 中高敏感度：基础 + 扩展判定
          isAd = definiteAd || extendedAdDetection
        } else if (sensitivityLevel >= 4) {
          // 中等敏感度：主要依赖明确判定，少量扩展
          isAd = definiteAd || (extendedAdDetection && !result.includes('不是') && !result.includes('no') && !result.includes('false'))
        } else {
          // 低敏感度：只接受明确的肯定回答
          isAd = definiteAd && !result.includes('不是') && !result.includes('no') && !result.includes('false')
        }
      }
      
      if (config.debugMode) {
        ctx.logger.info(`[DEBUG] 判定分析:`)
        ctx.logger.info(`[DEBUG] - 明确肯定: ${definiteAd}`)
        ctx.logger.info(`[DEBUG] - 扩展检测: ${extendedAdDetection}`)
        ctx.logger.info(`[DEBUG] - 模糊判定: ${ambiguousDetection}`)
        ctx.logger.info(`[DEBUG] - 网络热梗检测: ${hasInternetSlang}`)
        ctx.logger.info(`[DEBUG] - 敏感度级别: ${sensitivityLevel}`)
        ctx.logger.info(`[DEBUG] - 最终判定: ${isAd ? '是广告' : '非广告'}`)
      }
      
      return isAd
      
    } catch (error) {
      // 清除超时定时器
      clearTimeout(timeoutId)
      lastError = error
      
      // 获取HTTP状态码
      const statusCode = error.response?.status
      const isRetryableError = isErrorRetryable(error, statusCode)
      
      if (config.debugMode) {
        ctx.logger.error(`[DEBUG] 第 ${attempt + 1} 次请求失败: ${error.message}`)
        if (error.response) {
          ctx.logger.error(`[DEBUG] HTTP 状态码: ${statusCode}`)
          ctx.logger.error('[DEBUG] 响应头:', JSON.stringify(error.response.headers, null, 2))
          ctx.logger.error('[DEBUG] 响应体:', JSON.stringify(error.response.data, null, 2))
        }
        ctx.logger.error(`[DEBUG] 错误是否可重试: ${isRetryableError}`)
      }
      
      // 如果错误不可重试，直接退出
      if (!isRetryableError) {
        if (config.debugMode) {
          ctx.logger.warn(`[DEBUG] 遇到不可重试错误，停止重试: ${error.message}`)
        }
        break
      }
      
      // 切换到下一个API密钥（如果有多个密钥）
      if (config.aiModel.apiKeys.filter(key => key && key.trim() !== '').length > 1) {
        const { nextIndex } = ApiKeyManager.getNextApiKey(
          config.aiModel.apiKeys, 
          config.aiModel.currentKeyIndex || 0
        )
        config.aiModel.currentKeyIndex = nextIndex
        
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] AI模型切换到API密钥索引: ${config.aiModel.currentKeyIndex}`)
        }
      }
      
      // 如果还有重试机会，计算延迟时间并重试
      if (attempt < config.aiModel.retryCount) {
        const retryDelay = calculateRetryDelay(attempt, baseDelay, statusCode, error.name)
        
        if (config.debugMode) {
          ctx.logger.info(`[DEBUG] ${retryDelay}ms 后进行第 ${attempt + 2} 次重试 (错误类型: ${getErrorType(error, statusCode)})`)
        }
        
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }
  
  // 所有重试都失败了
  ctx.logger.error(`AI 检测请求失败，已重试 ${config.aiModel.retryCount} 次:`, lastError.message)
  if (config.debugMode) {
    ctx.logger.error('[DEBUG] 最终失败的错误详情:', lastError)
  }
  return false
}

/**
 * 处理检测到的广告消息
 */
async function handleAdvertisement(session: Session, config: Config, offenseTracker: OffenseTracker) {
  const actions = []
  const groupId = session.guildId || session.channelId
  let isRepeatOffense = false
  let offenseCount = 0

  try {
    // 调试日志：显示当前规则配置
    if (config.debugMode) {
      session.app.logger.info(`[DEBUG] 广告处理规则配置:`)
      session.app.logger.info(`[DEBUG] - 发送警告: ${config.rules.sendWarning}`)
      session.app.logger.info(`[DEBUG] - 撤回消息: ${config.rules.recallMessage}`)
      session.app.logger.info(`[DEBUG] - 禁言用户: ${config.rules.muteUser}`)
      session.app.logger.info(`[DEBUG] - 踢出用户: ${config.rules.kickUser}`)
      session.app.logger.info(`[DEBUG] - 反复触发禁言: ${config.repeatOffenseRules.enabled}`)
    }

    // 检查反复触发禁言
    if (config.repeatOffenseRules.enabled && groupId) {
      offenseCount = offenseTracker.addOffense(session.userId, groupId, session.content || '')
      
      if (offenseCount >= config.repeatOffenseRules.triggerThreshold) {
        isRepeatOffense = true
        
        if (config.debugMode) {
          session.app.logger.info(`[DEBUG] 🚨 触发反复违规禁言: 用户=${session.userId}, 群=${groupId}, 违规次数=${offenseCount}/${config.repeatOffenseRules.triggerThreshold}`)
        }
        
        // 发送反复触发警告消息
        if (config.repeatOffenseRules.warningMessage) {
          try {
            const warningMsg = config.repeatOffenseRules.warningMessage
              .replace('{userId}', session.userId)
              .replace('{count}', offenseCount.toString())
              .replace('{threshold}', config.repeatOffenseRules.triggerThreshold.toString())
              .replace('{timeWindow}', config.repeatOffenseRules.timeWindow.toString())
            
            await sendNotificationWithAutoRecall(session, warningMsg, config)
            actions.push('发送反复违规警告')
            
            if (config.debugMode) {
              session.app.logger.info(`[DEBUG] ✅ 已发送反复违规警告消息`)
            }
          } catch (error) {
            session.app.logger.warn('发送反复违规警告消息失败:', error)
          }
        }
        
        // 执行反复触发禁言
        try {
          await session.bot.muteGuildMember(session.guildId, session.userId, config.repeatOffenseRules.muteDuration * 60 * 1000)
          actions.push(`反复违规禁言 ${config.repeatOffenseRules.muteDuration} 分钟`)
          
          if (config.debugMode) {
            session.app.logger.info(`[DEBUG] ✅ 已执行反复违规禁言: ${config.repeatOffenseRules.muteDuration} 分钟`)
          }
        } catch (error) {
          session.app.logger.warn('反复违规禁言失败:', error)
        }
        
        // 执行反复触发踢出
        if (config.repeatOffenseRules.kickUser) {
          try {
            await session.bot.kickGuildMember(session.guildId, session.userId)
            actions.push('反复违规踢出群聊')
            
            if (config.debugMode) {
              session.app.logger.info(`[DEBUG] ✅ 已执行反复违规踢出`)
            }
          } catch (error) {
            session.app.logger.warn('反复违规踢出失败:', error)
          }
        }
        
        // 如果已经执行了反复触发处理，记录日志并可能跳过常规处理
        session.app.logger.info(`🔄 反复违规处理完成: 用户=${session.userId}, 群=${groupId}, 违规次数=${offenseCount}, 处理=${actions.join(', ')}`)
      } else {
        if (config.debugMode) {
          session.app.logger.info(`[DEBUG] 违规次数未达阈值: ${offenseCount}/${config.repeatOffenseRules.triggerThreshold}`)
        }
      }
    }

    // 常规处理逻辑（如果不是反复违规或者需要同时执行常规处理）
    // 发送警告消息（优先处理，如果同时开启撤回则先发送引用回复）
    if (config.rules.sendWarning && config.rules.warningMessage && !isRepeatOffense) {
      try {
        // 尝试引用回复原消息发送警告
        await sendNotificationWithAutoRecall(session, `<quote id="${session.messageId}"/>${config.rules.warningMessage}`, config)
        actions.push('发送引用警告')
        if (config.debugMode) {
          session.app.logger.info(`[DEBUG] ✅ 已发送引用警告消息`)
        }
      } catch (error) {
        // 如果引用失败（如消息已被撤回），则直接发送警告
        try {
          await sendNotificationWithAutoRecall(session, config.rules.warningMessage, config)
          actions.push('发送警告')
          if (config.debugMode) {
            session.app.logger.info(`[DEBUG] ✅ 已发送普通警告消息（引用失败）`)
          }
        } catch (sendError) {
          session.app.logger.warn('发送警告消息失败:', sendError)
        }
      }
    }

    // 撤回消息（在发送警告后执行）- 无论是否反复违规都执行
    if (config.rules.recallMessage) {
      try {
        await session.bot.deleteMessage(session.channelId, session.messageId)
        actions.push('撤回消息')
        if (config.debugMode) {
          session.app.logger.info(`[DEBUG] ✅ 已撤回广告消息`)
        }
      } catch (error) {
        session.app.logger.warn('撤回消息失败:', error)
        if (config.debugMode) {
          session.app.logger.error(`[DEBUG] ❌ 撤回消息失败:`, error)
        }
      }
    } else {
      if (config.debugMode) {
        session.app.logger.info(`[DEBUG] ⏭️ 跳过撤回消息（配置已关闭）`)
      }
    }

    // 常规禁言用户（仅在非反复违规时执行）
    if (config.rules.muteUser && !isRepeatOffense) {
      try {
        await session.bot.muteGuildMember(session.guildId, session.userId, config.rules.muteDuration * 60 * 1000)
        actions.push(`禁言 ${config.rules.muteDuration} 分钟`)
        if (config.debugMode) {
          session.app.logger.info(`[DEBUG] ✅ 已执行常规禁言: ${config.rules.muteDuration} 分钟`)
        }
      } catch (error) {
        session.app.logger.warn('禁言用户失败:', error)
      }
    }

    // 常规踢出用户（仅在非反复违规时执行）
    if (config.rules.kickUser && !isRepeatOffense) {
      try {
        await session.bot.kickGuildMember(session.guildId, session.userId)
        actions.push('踢出群聊')
        if (config.debugMode) {
          session.app.logger.info(`[DEBUG] ✅ 已执行常规踢出`)
        }
      } catch (error) {
        session.app.logger.warn('踢出用户失败:', error)
      }
    }

    // 记录处理结果
    if (actions.length > 0) {
      const logPrefix = isRepeatOffense ? '🔄 反复违规处理' : '📋 常规广告处理'
      const logSuffix = isRepeatOffense ? `(违规次数: ${offenseCount}/${config.repeatOffenseRules.triggerThreshold})` : ''
      session.app.logger.info(`${logPrefix}: ${actions.join(', ')} ${logSuffix}`)
    }
  } catch (error) {
    session.app.logger.error('处理广告消息时发生错误:', error)
  }
}
