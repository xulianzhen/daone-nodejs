-- Daone 一期完整建表脚本
-- 适用：MySQL 8.0 / 阿里云 RDS MySQL 8.0
-- 字符集：utf8mb4
-- 本文件只创建表结构，不包含测试数据。

CREATE TABLE IF NOT EXISTS daone_runtime_store (
    store_key VARCHAR(64) NOT NULL,
    store_value LONGTEXT NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (store_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_account (
    id BIGINT NOT NULL,
    phone VARCHAR(20) NULL,
    wechat_open_id VARCHAR(64) NULL,
    nickname VARCHAR(64) NOT NULL,
    avatar_url VARCHAR(500) NULL,
    email VARCHAR(128) NULL,
    gender VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN',
    birthday DATE NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'ENABLED',
    role VARCHAR(16) NOT NULL DEFAULT 'USER',
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_phone (phone),
    UNIQUE KEY uk_user_wechat (wechat_open_id),
    KEY idx_user_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS project (
    id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    title VARCHAR(128) NOT NULL,
    cover_asset_id BIGINT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_project_user_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS project_canvas (
    project_id BIGINT NOT NULL,
    canvas_json LONGTEXT NOT NULL,
    revision BIGINT NOT NULL DEFAULT 0,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS project_version (
    id BIGINT NOT NULL,
    project_id BIGINT NOT NULL,
    version_no INT NOT NULL,
    canvas_json LONGTEXT NOT NULL,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_project_version (project_id, version_no),
    KEY idx_project_version_created (project_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS project_share (
    id BIGINT NOT NULL,
    share_code VARCHAR(40) NOT NULL,
    project_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    status VARCHAR(16) NOT NULL,
    expire_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_project_share_code (share_code),
    KEY idx_project_share_project (project_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS asset (
    id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    project_id BIGINT NULL,
    type VARCHAR(16) NOT NULL,
    source VARCHAR(16) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    object_key VARCHAR(500) NULL,
    content_type VARCHAR(100) NULL,
    file_size BIGINT NULL,
    width INT NULL,
    height INT NULL,
    duration_seconds INT NULL,
    review_status VARCHAR(16) NOT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_asset_user_created (user_id, created_at),
    KEY idx_asset_project_created (project_id, created_at),
    KEY idx_asset_source_status (source, review_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS asset_favorite (
    id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    asset_id BIGINT NOT NULL,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_asset_favorite (user_id, asset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS generation_task (
    id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    project_id BIGINT NULL,
    node_id VARCHAR(64) NULL,
    task_type VARCHAR(16) NOT NULL,
    capability_code VARCHAR(64) NOT NULL,
    prompt LONGTEXT NULL,
    parameters_json LONGTEXT NULL,
    reference_asset_ids_json LONGTEXT NULL,
    idempotency_key VARCHAR(64) NOT NULL,
    provider_task_id VARCHAR(128) NULL,
    status VARCHAR(16) NOT NULL,
    progress INT NOT NULL DEFAULT 0,
    estimated_points BIGINT NOT NULL DEFAULT 0,
    actual_points BIGINT NULL,
    error_code VARCHAR(64) NULL,
    error_message VARCHAR(500) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_generation_idempotency (user_id, idempotency_key),
    KEY idx_task_user_status_created (user_id, status, created_at),
    KEY idx_task_provider_id (provider_task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS generation_result (
    id BIGINT NOT NULL,
    task_id BIGINT NOT NULL,
    asset_id BIGINT NOT NULL,
    sort_no INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_generation_result (task_id, asset_id),
    KEY idx_generation_result_task (task_id, sort_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS workflow (
    id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    name VARCHAR(128) NOT NULL,
    description VARCHAR(500) NULL,
    cover_asset_id BIGINT NULL,
    workflow_json LONGTEXT NOT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_workflow_user_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS chat_session (
    id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    project_id BIGINT NOT NULL,
    title VARCHAR(128) NOT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_chat_session_user_updated (user_id, updated_at),
    KEY idx_chat_session_project (project_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS chat_message (
    id BIGINT NOT NULL,
    session_id BIGINT NOT NULL,
    role VARCHAR(16) NOT NULL,
    content LONGTEXT NOT NULL,
    attachment_asset_ids_json LONGTEXT NULL,
    generation_task_ids_json LONGTEXT NULL,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_chat_message_session (session_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS point_account (
    user_id BIGINT NOT NULL,
    available_points BIGINT NOT NULL DEFAULT 0,
    frozen_points BIGINT NOT NULL DEFAULT 0,
    granted_total BIGINT NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 0,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS point_ledger (
    id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    action VARCHAR(16) NOT NULL,
    amount BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    biz_type VARCHAR(32) NOT NULL,
    biz_id VARCHAR(64) NOT NULL,
    description VARCHAR(255) NULL,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_point_biz (user_id, biz_type, biz_id, action),
    KEY idx_point_ledger_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS subscription_plan (
    id BIGINT NOT NULL,
    plan_code VARCHAR(32) NOT NULL,
    plan_name VARCHAR(64) NOT NULL,
    description VARCHAR(500) NULL,
    benefits_json LONGTEXT NULL,
    status VARCHAR(16) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_plan_code (plan_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS subscription_plan_price (
    id BIGINT NOT NULL,
    plan_id BIGINT NOT NULL,
    price_code VARCHAR(32) NOT NULL,
    cycle_unit VARCHAR(16) NOT NULL,
    cycle_count INT NOT NULL,
    price_fen BIGINT NOT NULL,
    original_price_fen BIGINT NULL,
    grant_points BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_price_code (price_code),
    KEY idx_plan_price_plan (plan_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_subscription (
    id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    plan_id BIGINT NOT NULL,
    price_code VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL,
    current_period_start DATETIME(3) NOT NULL,
    current_period_end DATETIME(3) NOT NULL,
    auto_renew TINYINT NOT NULL DEFAULT 0,
    latest_order_no VARCHAR(40) NULL,
    version INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_subscription_user (user_id),
    KEY idx_subscription_expire (status, current_period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS payment_order (
    id BIGINT NOT NULL,
    order_no VARCHAR(40) NOT NULL,
    user_id BIGINT NOT NULL,
    order_type VARCHAR(20) NOT NULL,
    product_code VARCHAR(32) NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    product_snapshot_json LONGTEXT NOT NULL,
    amount_fen BIGINT NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'CNY',
    status VARCHAR(16) NOT NULL,
    expire_at DATETIME(3) NOT NULL,
    paid_at DATETIME(3) NULL,
    idempotency_key VARCHAR(64) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_no (order_no),
    UNIQUE KEY uk_user_idempotency (user_id, idempotency_key),
    KEY idx_order_user_created (user_id, created_at),
    KEY idx_order_status_expire (status, expire_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS payment_transaction (
    id BIGINT NOT NULL,
    transaction_no VARCHAR(40) NOT NULL,
    order_no VARCHAR(40) NOT NULL,
    pay_type VARCHAR(16) NOT NULL,
    channel_transaction_no VARCHAR(64) NULL,
    status VARCHAR(16) NOT NULL,
    pay_payload LONGTEXT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_transaction_no (transaction_no),
    UNIQUE KEY uk_order_pay_type (order_no, pay_type),
    UNIQUE KEY uk_channel_transaction (pay_type, channel_transaction_no),
    KEY idx_payment_transaction_order (order_no, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS payment_notify_log (
    id BIGINT NOT NULL,
    pay_type VARCHAR(16) NOT NULL,
    notify_id VARCHAR(128) NOT NULL,
    order_no VARCHAR(40) NULL,
    raw_payload LONGTEXT NOT NULL,
    process_status VARCHAR(16) NOT NULL,
    error_message VARCHAR(500) NULL,
    created_at DATETIME(3) NOT NULL,
    processed_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_payment_notify (pay_type, notify_id),
    KEY idx_payment_notify_order (order_no, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS prompt_template (
    id BIGINT NOT NULL,
    template_code VARCHAR(64) NOT NULL,
    template_name VARCHAR(128) NOT NULL,
    scene VARCHAR(32) NOT NULL,
    content LONGTEXT NOT NULL,
    status VARCHAR(16) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_prompt_template_code (template_code),
    KEY idx_prompt_template_scene (scene, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS model_config (
    id BIGINT NOT NULL,
    model_code VARCHAR(64) NOT NULL,
    model_name VARCHAR(128) NOT NULL,
    task_type VARCHAR(16) NOT NULL,
    base_points BIGINT NOT NULL,
    parameters_json LONGTEXT NOT NULL,
    status VARCHAR(16) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_model_config_code (model_code),
    KEY idx_model_config_type_status (task_type, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS inspiration (
    id BIGINT NOT NULL,
    title VARCHAR(128) NOT NULL,
    cover_url VARCHAR(1000) NOT NULL,
    category_code VARCHAR(32) NOT NULL,
    author_name VARCHAR(64) NOT NULL,
    author_avatar_url VARCHAR(1000) NULL,
    like_count BIGINT NOT NULL DEFAULT 0,
    view_count BIGINT NOT NULL DEFAULT 0,
    sort_no INT NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_inspiration_category_status (category_code, status, sort_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
