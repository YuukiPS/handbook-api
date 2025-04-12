export enum ErrorCodes {
	FAIL = -1,
	CANCEL = -2,
	NO_SUCH_METHOD = -10,
	LOGIN_BASE = -100,
	LOGIN_FAILED = -101,
	LOGIN_CANCEL = -102,
	LOGIN_ERROR = -103,
	LOGOUT_FAILED = -104,
	LOGOUT_CANCEL = -105,
	LOGOUT_ERROR = 106,
	PAY_FAILED = -107,
	PAY_CANCEL = -108,
	PAY_ERROR = -109,
	PAY_UNKNOWN = -116,
	EXIT_FAILED = -110,
	EXIT_NO_DIALOG = -111,
	EXIT_CANCEL = -112,
	EXIT_ERROR = -113,
	INIT_FAILED = -114,
	INIT_ERROR = -115,
	LOGIN_FORBIDDED = -117,
	NEED_REALNAME = -118,
	NEED_GUARDIAN = -119,
	EOS_DLL_ERROR = -1001,
	EOS_TOKEN_ERROR = -1002,
	GOOGLE_PC_TOKEN_ERROR = -1003,
	// https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
	WEB_BAD_REQUEST = 400,
	WEB_UNAUTHORIZED = 401,
	WEB_FORBIDDEN = 403,
	WEB_NOFOUND = 404,
	WEB_TIMEOUT = 408,
	WEB_RATELIMIT = 429,
	CDK_EXCHANGE_FAIL = -2003
}

export enum SuccessCodes {
	WEB_STANDARD = 200,
	RETCODE = 0,
	REGISTER = 1,
	PAY_LAUNCH = -120
}

export const statusCodes = {
	error: ErrorCodes,
	success: SuccessCodes
}

export const _ = {
	statusCodes
}

export default _
