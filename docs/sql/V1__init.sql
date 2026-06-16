CREATE TABLE user_account (
    id BIGINT PRIMARY KEY,
    phone VARCHAR(20),
    wechat_open_id VARCHAR(64),
    nickname VARCHAR(64) NOT NULL,
    avatar_url VARCHAR(500),
    email VARCHAR(128),
    gender VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN',
    birthday DATE,
    status VARCHAR(16) NOT NULL DEFAULT 'ENABLED',
    role VARCHAR(16) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_user_phone UNIQUE (phone),
    CONSTRAINT uk_user_wechat UNIQUE (wechat_open_id)
);

CREATE TABLE project (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(128) NOT NULL,
    cover_asset_id BIGINT,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE INDEX idx_project_user_updated ON project(user_id, updated_at);

CREATE TABLE project_canvas (
    project_id BIGINT PRIMARY KEY,
    canvas_json CLOB NOT NULL,
    revision BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE project_version (
    id BIGINT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    version_no INT NOT NULL,
    canvas_json CLOB NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_project_version UNIQUE (project_id, version_no)
);

CREATE TABLE project_share (
    id BIGINT PRIMARY KEY,
    share_code VARCHAR(40) NOT NULL,
    project_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    status VARCHAR(16) NOT NULL,
    expire_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_project_share_code UNIQUE (share_code)
);
CREATE INDEX idx_project_share_project ON project_share(project_id, status);

CREATE TABLE asset (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    project_id BIGINT,
    type VARCHAR(16) NOT NULL,
    source VARCHAR(16) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    object_key VARCHAR(500),
    content_type VARCHAR(100),
    file_size BIGINT,
    width INT,
    height INT,
    duration_seconds INT,
    review_status VARCHAR(16) NOT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE INDEX idx_asset_user_created ON asset(user_id, created_at);

CREATE TABLE asset_favorite (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    asset_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_asset_favorite UNIQUE (user_id, asset_id)
);

CREATE TABLE generation_task (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    project_id BIGINT,
    node_id VARCHAR(64),
    task_type VARCHAR(16) NOT NULL,
    capability_code VARCHAR(64) NOT NULL,
    prompt CLOB,
    parameters_json CLOB,
    reference_asset_ids_json CLOB,
    idempotency_key VARCHAR(64) NOT NULL,
    provider_task_id VARCHAR(128),
    status VARCHAR(16) NOT NULL,
    progress INT NOT NULL DEFAULT 0,
    estimated_points BIGINT NOT NULL DEFAULT 0,
    actual_points BIGINT,
    error_code VARCHAR(64),
    error_message VARCHAR(500),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE INDEX idx_task_user_status_created ON generation_task(user_id, status, created_at);
CREATE UNIQUE INDEX uk_generation_idempotency ON generation_task(user_id, idempotency_key);

CREATE TABLE generation_result (
    id BIGINT PRIMARY KEY,
    task_id BIGINT NOT NULL,
    asset_id BIGINT NOT NULL,
    sort_no INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE workflow (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(128) NOT NULL,
    description VARCHAR(500),
    cover_asset_id BIGINT,
    workflow_json CLOB NOT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE chat_session (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    project_id BIGINT NOT NULL,
    title VARCHAR(128) NOT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE chat_message (
    id BIGINT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    role VARCHAR(16) NOT NULL,
    content CLOB NOT NULL,
    attachment_asset_ids_json CLOB,
    generation_task_ids_json CLOB,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE point_account (
    user_id BIGINT PRIMARY KEY,
    available_points BIGINT NOT NULL DEFAULT 0,
    frozen_points BIGINT NOT NULL DEFAULT 0,
    granted_total BIGINT NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE point_ledger (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    action VARCHAR(16) NOT NULL,
    amount BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    biz_type VARCHAR(32) NOT NULL,
    biz_id VARCHAR(64) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_point_biz UNIQUE (user_id, biz_type, biz_id, action)
);

CREATE TABLE subscription_plan (
    id BIGINT PRIMARY KEY,
    plan_code VARCHAR(32) NOT NULL,
    plan_name VARCHAR(64) NOT NULL,
    description VARCHAR(500),
    benefits_json CLOB,
    status VARCHAR(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_plan_code UNIQUE (plan_code)
);

CREATE TABLE subscription_plan_price (
    id BIGINT PRIMARY KEY,
    plan_id BIGINT NOT NULL,
    price_code VARCHAR(32) NOT NULL,
    cycle_unit VARCHAR(16) NOT NULL,
    cycle_count INT NOT NULL,
    price_fen BIGINT NOT NULL,
    original_price_fen BIGINT,
    grant_points BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_price_code UNIQUE (price_code)
);

CREATE TABLE user_subscription (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    plan_id BIGINT NOT NULL,
    price_code VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL,
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    auto_renew TINYINT NOT NULL DEFAULT 0,
    latest_order_no VARCHAR(40),
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_subscription_user UNIQUE (user_id)
);

CREATE TABLE payment_order (
    id BIGINT PRIMARY KEY,
    order_no VARCHAR(40) NOT NULL,
    user_id BIGINT NOT NULL,
    order_type VARCHAR(20) NOT NULL,
    product_code VARCHAR(32) NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    product_snapshot_json CLOB NOT NULL,
    amount_fen BIGINT NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'CNY',
    status VARCHAR(16) NOT NULL,
    expire_at TIMESTAMP NOT NULL,
    paid_at TIMESTAMP,
    idempotency_key VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_order_no UNIQUE (order_no),
    CONSTRAINT uk_user_idempotency UNIQUE (user_id, idempotency_key)
);

CREATE TABLE payment_transaction (
    id BIGINT PRIMARY KEY,
    transaction_no VARCHAR(40) NOT NULL,
    order_no VARCHAR(40) NOT NULL,
    pay_type VARCHAR(16) NOT NULL,
    channel_transaction_no VARCHAR(64),
    status VARCHAR(16) NOT NULL,
    pay_payload CLOB,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_transaction_no UNIQUE (transaction_no),
    CONSTRAINT uk_order_pay_type UNIQUE (order_no, pay_type),
    CONSTRAINT uk_channel_transaction UNIQUE (pay_type, channel_transaction_no)
);

CREATE TABLE payment_notify_log (
    id BIGINT PRIMARY KEY,
    pay_type VARCHAR(16) NOT NULL,
    notify_id VARCHAR(128) NOT NULL,
    order_no VARCHAR(40),
    raw_payload CLOB NOT NULL,
    process_status VARCHAR(16) NOT NULL,
    error_message VARCHAR(500),
    created_at TIMESTAMP NOT NULL,
    processed_at TIMESTAMP,
    CONSTRAINT uk_payment_notify UNIQUE (pay_type, notify_id)
);

CREATE TABLE prompt_template (
    id BIGINT PRIMARY KEY,
    template_code VARCHAR(64) NOT NULL,
    template_name VARCHAR(128) NOT NULL,
    scene VARCHAR(32) NOT NULL,
    content CLOB NOT NULL,
    status VARCHAR(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_prompt_template_code UNIQUE (template_code)
);

CREATE TABLE model_config (
    id BIGINT PRIMARY KEY,
    model_code VARCHAR(64) NOT NULL,
    model_name VARCHAR(128) NOT NULL,
    task_type VARCHAR(16) NOT NULL,
    base_points BIGINT NOT NULL,
    parameters_json CLOB NOT NULL,
    status VARCHAR(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_model_config_code UNIQUE (model_code)
);

CREATE TABLE inspiration (
    id BIGINT PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    cover_url VARCHAR(1000) NOT NULL,
    category_code VARCHAR(32) NOT NULL,
    author_name VARCHAR(64) NOT NULL,
    author_avatar_url VARCHAR(1000),
    like_count BIGINT NOT NULL DEFAULT 0,
    view_count BIGINT NOT NULL DEFAULT 0,
    sort_no INT NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE INDEX idx_inspiration_category_status ON inspiration(category_code, status, sort_no);
