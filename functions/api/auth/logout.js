import { clearCookie, json } from '../_lib';
export const onRequestPost = async () => {
    return json({ ok: true }, {
        headers: {
            'Set-Cookie': clearCookie('shipwrkrs_session'),
        },
    });
};
