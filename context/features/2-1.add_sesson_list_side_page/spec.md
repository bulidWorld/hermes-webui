# 新增会话历史功能
页面左侧边栏展示历史会话列表
- 数据来源：通过hermes-agent后端接口查询
```python
GET /v1/sessions — list historical sessions.
    Query parameters:
    - user_id (required): filter sessions by user ID
    - limit (optional, default 20, max 100): number of sessions to return
    - offset (optional, default 0): pagination offset
```
- 